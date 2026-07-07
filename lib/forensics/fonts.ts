// lib/forensics/fonts.ts
// M2: font-subset tamper detection with the changed region highlighted on the
// rendered page (the classic "changed the amount" signal). Stubbed for M1 so the
// analyze() pipeline is complete and type-safe. When implemented, this returns a
// critical EvidenceItem plus a RegionHighlight boxing the edited glyphs.

import type { EvidenceItem, RegionHighlight } from "../types";

export async function analyzeFonts(
  _bytes: Uint8Array
): Promise<{ evidence: EvidenceItem[]; highlights: RegionHighlight[] }> {
  return { evidence: [], highlights: [] };
}
