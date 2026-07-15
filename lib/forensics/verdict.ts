// lib/forensics/verdict.ts
// The transparent rules engine. It turns evidence into a verdict + confidence.
// A rules engine that shows its reasoning is more persuasive here than an opaque
// score, and it cannot hallucinate a verdict. See docs/VERDICT_LOGIC.md.

import type { CredentialResult, EvidenceItem, Verdict } from "../types";

// Tamper signals: structure, dates, editor producer, fonts, ELA, broken
// credential. The strongest, most defensible claim.
const TAMPER_SIGNALS = new Set<string>([
  "incremental-update",
  "mod-after-create",
  "producer-editor",
  "font-subset-mismatch",
  "revision-diff",
  "ela-region",
  "broken-credential",
]);

// Synthetic signals: generative-tool producer, synthetic image artifacts.
// Deliberately weaker and lower confidence: these signals are spoofable.
const SYNTH_SIGNALS = new Set<string>(["producer-generator", "image-synthetic"]);

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// Noisy-or: multiple weak signals do not overshoot, one strong signal decides.
function noisyOr(weights: number[]): number {
  return 1 - weights.reduce((acc, w) => acc * (1 - clamp01(w)), 1);
}

function weightsOf(evidence: EvidenceItem[], signals: Set<string>): number[] {
  return evidence.filter((e) => signals.has(e.signal)).map((e) => e.weight);
}

function round(x: number): number {
  return Math.round(x * 100) / 100;
}

// Never claim certainty. A verifier that shows 100% reads as naive.
function clampConfidence(x: number): number {
  return Math.max(0.5, Math.min(0.97, round(x)));
}

export function decideVerdict(
  evidence: EvidenceItem[],
  credential: CredentialResult
): { verdict: Verdict; confidence: number } {
  const tamper = noisyOr(weightsOf(evidence, TAMPER_SIGNALS));
  const synth = noisyOr(weightsOf(evidence, SYNTH_SIGNALS));
  // Treat a present credential as valid for the demo unless explicitly broken.
  const hasValidCredential =
    credential.hasCredential && credential.valid !== false;

  // 1. Tampered dominates: structure/font/ELA edits are the strongest claim.
  if (tamper >= 0.6) {
    return { verdict: "tampered", confidence: clampConfidence(0.5 + tamper / 2) };
  }
  // 2. Synthetic, only if tamper is not in play.
  if (synth >= 0.6 && tamper < 0.3) {
    return {
      verdict: "ai-generated",
      confidence: clampConfidence(0.45 + synth / 2),
    };
  }
  // 3. Mixed but not conclusive. Unknown is a first-class outcome.
  if (tamper >= 0.3 || synth >= 0.3) {
    return {
      verdict: "unknown",
      confidence: clampConfidence(0.5 + Math.max(tamper, synth) / 3),
    };
  }
  // 4. Clean. A valid credential reinforces confidence but is not required.
  const base = hasValidCredential ? 0.9 : 0.75;
  return { verdict: "authentic", confidence: base };
}
