// lib/forensics/incrementalUpdates.ts
// The strongest structural tamper signal, and pure byte-scanning (no pdf.js).
// A PDF edited and re-saved incrementally contains more than one %%EOF marker
// and usually more than one startxref. Cross-reference streams may carry a
// /Prev entry pointing at an earlier xref.
//
// Nuance encoded so the engine looks careful, not trigger-happy: a single
// incremental update is also how a legitimate digital signature is added. So we
// report the count and interpret in context. The verdict engine combines this
// with the producer and date signals.

import type { EvidenceItem } from "../types";

export function detectIncrementalUpdates(bytes: Uint8Array): EvidenceItem[] {
  const text = new TextDecoder("latin1").decode(bytes);
  const eofs = (text.match(/%%EOF/g) || []).length;
  const startxrefs = (text.match(/startxref/g) || []).length;
  const prev = /\/Prev\s+\d+/.test(text);
  const generations = Math.max(eofs, startxrefs);
  const evidence: EvidenceItem[] = [];

  if (generations > 1) {
    evidence.push({
      id: "incremental",
      signal: "incremental-update",
      severity: "critical",
      title: "Saved again after it was created",
      detail: `The file contains ${generations} save generations${
        prev ? " with a linked previous version" : ""
      }. Content was appended or changed after the original was written. A single update can be a legitimate signature, but combined with the producer and date signals this indicates an edit after issuance.`,
      weight: 0.6,
    });
  } else {
    evidence.push({
      id: "single-generation",
      signal: "structure",
      severity: "info",
      title: "Single save generation",
      detail:
        "The file has one save generation and no appended revisions, consistent with a document that was written once and never re-saved.",
      weight: 0,
    });
  }
  return evidence;
}
