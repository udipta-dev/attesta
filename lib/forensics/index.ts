// lib/forensics/index.ts
// Entry point. analyze(file) runs the credential check, then all applicable
// detectors, then the rules engine, then attaches a signed receipt. The engine
// is free of React so it stays testable and reusable. See docs/FORENSICS_ENGINE_SPEC.md.

import type {
  AnalysisResult,
  DocMetadata,
  EvidenceItem,
  RegionHighlight,
} from "../types";
import { sha256Hex, attachReceipt } from "../crypto/receipt";
import { checkCredential } from "./c2pa";
import { readPdfMeta } from "./pdfMeta";
import { detectIncrementalUpdates } from "./incrementalUpdates";
import { analyzeRevisionDiff } from "./revisionDiff";
import { analyzeFonts } from "./fonts";
import { errorLevelAnalysis } from "./ela";
import { decideVerdict } from "./verdict";

export async function analyze(file: File): Promise<AnalysisResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileHashSha256 = await sha256Hex(bytes);
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  // Credential check first (the ceiling). Drives the golden-rule UI line.
  const credential = await checkCredential(file);

  const evidence: EvidenceItem[] = [];
  let metadata: DocMetadata = {};
  const highlights: RegionHighlight[] = [];

  // The credential info row. The prominent golden-rule banner is rendered
  // separately in the UI, but this keeps the evidence list complete and honest.
  if (!credential.hasCredential) {
    evidence.push({
      id: "no-credential",
      signal: "credential",
      severity: "info",
      title: "No Content Credential found",
      detail:
        "This file carries no C2PA content credential. Attesta ran the forensic floor instead, analyzing the document's own structure and metadata.",
      weight: 0,
    });
  } else {
    evidence.push({
      id: "has-credential",
      signal: "credential",
      severity: "info",
      title: "Content Credential present",
      detail:
        credential.summary ??
        "A C2PA content credential is attached. See the Provenance ceiling tab.",
      weight: 0,
    });
  }

  if (isPdf) {
    try {
      const meta = await readPdfMeta(bytes);
      metadata = meta.metadata;
      evidence.push(...meta.evidence);
    } catch {
      evidence.push({
        id: "pdf-meta-error",
        signal: "metadata",
        severity: "info",
        title: "Metadata could not be read",
        detail:
          "Attesta could not parse this file's metadata. It may be encrypted or damaged. The verdict is Unknown pending manual review.",
        weight: 0,
      });
    }
    const incremental = detectIncrementalUpdates(bytes);
    evidence.push(...incremental);
    const fonts = await analyzeFonts(bytes);
    evidence.push(...fonts.evidence);
    highlights.push(...fonts.highlights);
    // Only rebuild-and-diff when the file actually carries a later revision, so
    // this never fires (or draws a box) on a clean single-save document.
    if (incremental.some((e) => e.signal === "incremental-update")) {
      const rev = await analyzeRevisionDiff(bytes);
      evidence.push(...rev.evidence);
      highlights.push(...rev.highlights);
    }
  } else {
    const ela = await errorLevelAnalysis(file);
    evidence.push(...ela.evidence);
    highlights.push(...ela.highlights);
  }

  const { verdict, confidence } = decideVerdict(evidence, credential);

  const result: AnalysisResult = {
    fileName: file.name,
    fileHashSha256,
    docType: isPdf ? "pdf" : "image",
    hasCredential: credential.hasCredential,
    credentialSummary: credential.summary,
    verdict,
    confidence,
    evidence,
    highlights,
    metadata,
    analyzedAt: new Date().toISOString(),
  };
  return attachReceipt(result);
}
