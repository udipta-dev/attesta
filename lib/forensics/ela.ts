// lib/forensics/ela.ts
// Image Error Level Analysis (the image path). PNG is lossless, so ELA is not
// meaningful and we say so rather than report a false signal. Full ELA on JPEG
// with region highlighting arrives in M2; for M1 the image path is present and
// honest about what it did.

import type { EvidenceItem, RegionHighlight } from "../types";

export async function errorLevelAnalysis(
  file: File
): Promise<{ evidence: EvidenceItem[]; highlights: RegionHighlight[] }> {
  const evidence: EvidenceItem[] = [];
  const highlights: RegionHighlight[] = [];

  if (file.type === "image/png") {
    evidence.push({
      id: "ela-skip",
      signal: "ela",
      severity: "info",
      title: "Error Level Analysis not applicable",
      detail:
        "This is a lossless PNG. ELA is only meaningful on re-compressed (JPEG) images, so Attesta skipped it rather than report a false signal.",
      weight: 0,
    });
    return { evidence, highlights };
  }

  // M2: recompress, diff, amplify, and box the highest-error region.
  evidence.push({
    id: "ela-pending",
    signal: "ela",
    severity: "info",
    title: "Image received",
    detail:
      "Attesta read the image. Deep Error Level Analysis with region highlighting arrives in the next build. For the hero flow, drop in a PDF.",
    weight: 0,
  });
  return { evidence, highlights };
}
