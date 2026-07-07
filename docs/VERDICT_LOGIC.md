# Verdict Logic

How `lib/forensics/verdict.ts` turns evidence into a verdict, a confidence, and keeps the result honest. This is a transparent rules engine on purpose. A rules engine that shows its reasoning is more persuasive in this pitch than an opaque score, and it cannot "hallucinate" a verdict.

Types are in `lib/types.ts`. Input: `EvidenceItem[]` from the detectors plus the credential result. Output: `{ verdict, confidence }`.

---

## Signal classes

Group evidence by what it implies:
- **Tamper signals:** `incremental-update`, `mod-after-create`, `font-subset-mismatch`, `ela-region`, and a `producer-metadata` hit when the producer is a document editor.
- **Synthetic signals:** `producer-metadata` when the producer is a generative tool (ChatGPT, Gemini, DALL, Canva-as-generator), plus image synthetic artifacts if present.
- **Provenance signal:** a valid C2PA credential (reinforces Authentic); an invalid or broken credential (a tamper signal).
- **Neutral/info:** anything with weight 0.

Each `EvidenceItem` has a `weight` (0..1) and `severity` (`info` | `warn` | `critical`).

---

## Decision procedure

Compute two scores from the evidence:
- `tamperScore` = combine tamper-signal weights.
- `syntheticScore` = combine synthetic-signal weights.

Combine weights with diminishing returns so multiple weak signals do not overshoot, and so one strong signal is decisive. A simple, defensible combiner:

```
combined = 1 - product(1 - weight_i)   // "noisy-or"
```

Then:

```ts
export function decideVerdict(evidence, credential) {
  const tamper = noisyOr(weightsOf(evidence, TAMPER_SIGNALS));
  const synth  = noisyOr(weightsOf(evidence, SYNTH_SIGNALS));
  const hasValidCredential = credential.hasCredential; // treat as valid for demo unless broken

  // 1. Tampered dominates: structure/font/ELA edits are the strongest, most defensible claim.
  if (tamper >= 0.6) {
    return { verdict: "tampered", confidence: round(0.5 + tamper/2) };
  }
  // 2. Synthetic, only if tamper is not in play.
  if (synth >= 0.6 && tamper < 0.3) {
    return { verdict: "ai-generated", confidence: round(0.45 + synth/2) };
  }
  // 3. Mixed but not conclusive -> Unknown (a first-class outcome).
  if (tamper >= 0.3 || synth >= 0.3) {
    return { verdict: "unknown", confidence: round(0.5 + Math.max(tamper, synth)/3) };
  }
  // 4. Clean. A valid credential reinforces confidence but is not required.
  const base = hasValidCredential ? 0.9 : 0.75;
  return { verdict: "authentic", confidence: base };
}
```

Notes:
- **Thresholds are tunable.** Tune them against the prepared samples so the matched pair lands cleanly (clean -> Authentic, tampered -> Tampered) while a genuinely ambiguous file lands on Unknown. Do not tune by hardcoding per-file; tune the thresholds and weights.
- **AI-generation is deliberately harder to trigger and lower confidence.** It relies on spoofable signals. Never let a lone producer string push confidence high. This matches the product's honesty.
- **Unknown is good.** Reaching Unknown on a weak file demonstrates the "graduated verdict, not pass or fail" claim. Do not force everything into Authentic or Tampered.
- **Broken credential = tamper signal.** If C2PA reports a manifest that fails validation, add a strong tamper weight (a credential that does not match the bytes is a red flag).

---

## Confidence

Confidence is a function of signal strength and agreement, clamped to a sensible range (roughly 0.5 to 0.97). Do not show 100%. A verifier that claims certainty reads as naive. Show, for example, "Tampered, 88% confidence" with the evidence that drives it.

---

## Mapping to the UI

- The verdict badge shows the verdict + confidence.
- The evidence list shows every `EvidenceItem` (including info items like "No credential found, ran the floor" and "ELA not applicable to PNG"), ordered by severity then weight. Showing the info items too makes the tool feel thorough and honest.
- For Tampered results driven by font or ELA signals, the associated `RegionHighlight`s are drawn on the document preview.
