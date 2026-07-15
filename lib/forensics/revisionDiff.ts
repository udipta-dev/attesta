// lib/forensics/revisionDiff.ts
// The "show me exactly what changed" signal, and it is fully client-side and
// free. A PDF saved incrementally still contains its original first revision
// (everything up to the first %%EOF). We rebuild that original, render it and
// the current file to canvases at the same scale, diff the pixels, and box the
// changed region on the page. This turns "there were 2 save generations" into
// "here is the before and after of the altered number."
//
// Browser-only (needs canvas + pdf.js). Gated in index.ts to run only when an
// incremental update was detected, so it never fires on a single-save file.

import type { EvidenceItem, RegionHighlight } from "../types";

// Must match DocumentPreview's TARGET_WIDTH so the highlight lines up with the
// rendered page (highlight coordinates are in this CSS-pixel space).
const DIFF_WIDTH = 560;

// Bytes of the first saved revision: everything through the first %%EOF marker.
function firstRevisionBytes(bytes: Uint8Array): Uint8Array | null {
  for (let i = 0; i + 5 <= bytes.length; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x25 && // %
      bytes[i + 2] === 0x45 && // E
      bytes[i + 3] === 0x4f && // O
      bytes[i + 4] === 0x46 // F
    ) {
      let end = i + 5;
      while (end < bytes.length && (bytes[end] === 0x0d || bytes[end] === 0x0a)) {
        end++;
      }
      return bytes.slice(0, end);
    }
  }
  return null;
}

async function renderPage1(
  bytes: Uint8Array,
  pdfjs: Awaited<ReturnType<typeof import("./pdfjs").getPdfjs>>
): Promise<{ data: Uint8ClampedArray; w: number; h: number } | null> {
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: DIFF_WIDTH / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, w: canvas.width, h: canvas.height };
}

export async function analyzeRevisionDiff(
  bytes: Uint8Array
): Promise<{ evidence: EvidenceItem[]; highlights: RegionHighlight[] }> {
  const evidence: EvidenceItem[] = [];
  const highlights: RegionHighlight[] = [];
  try {
    if (typeof document === "undefined") return { evidence, highlights };
    const original = firstRevisionBytes(bytes);
    // No earlier revision to compare against (single save).
    if (!original || original.length >= bytes.length) return { evidence, highlights };

    const { getPdfjs } = await import("./pdfjs");
    const pdfjs = await getPdfjs();
    const a = await renderPage1(original, pdfjs);
    const b = await renderPage1(bytes, pdfjs);
    if (!a || !b) return { evidence, highlights };

    const w = Math.min(a.w, b.w);
    const h = Math.min(a.h, b.h);
    // Per-row horizontal extent of the change.
    const rowMinX = new Array<number>(h).fill(Infinity);
    const rowMaxX = new Array<number>(h).fill(-1);
    let changed = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * a.w + x) * 4;
        const j = (y * b.w + x) * 4;
        const d =
          Math.abs(a.data[i] - b.data[j]) +
          Math.abs(a.data[i + 1] - b.data[j + 1]) +
          Math.abs(a.data[i + 2] - b.data[j + 2]);
        if (d > 60) {
          changed++;
          if (x < rowMinX[y]) rowMinX[y] = x;
          if (x > rowMaxX[y]) rowMaxX[y] = x;
        }
      }
    }
    if (changed <= 8) return { evidence, highlights };

    // Group changed rows into horizontal bands, one per edited line of text,
    // bridging small vertical gaps so a single line stays a single box.
    type Band = { y0: number; y1: number; x0: number; x1: number };
    const bands: Band[] = [];
    let cur: Band | null = null;
    let gap = 0;
    for (let y = 0; y < h; y++) {
      if (rowMaxX[y] >= 0) {
        if (!cur) cur = { y0: y, y1: y, x0: rowMinX[y], x1: rowMaxX[y] };
        else {
          cur.y1 = y;
          cur.x0 = Math.min(cur.x0, rowMinX[y]);
          cur.x1 = Math.max(cur.x1, rowMaxX[y]);
        }
        gap = 0;
      } else if (cur) {
        if (++gap > 8) {
          bands.push(cur);
          cur = null;
        }
      }
    }
    if (cur) bands.push(cur);

    const pad = 6;
    for (const bnd of bands) {
      const bw = bnd.x1 - bnd.x0;
      const bh = bnd.y1 - bnd.y0;
      if (bw < 4 || bh < 3) continue; // ignore speckle
      // Guard: a near-full-page band means the rebuilt original misrendered.
      if (bw * bh > 0.6 * w * h) return { evidence, highlights };
      const x = Math.max(0, bnd.x0 - pad);
      const y = Math.max(0, bnd.y0 - pad);
      highlights.push({
        page: 1,
        x,
        y,
        width: Math.min(w, bnd.x1 + pad) - x,
        height: Math.min(h, bnd.y1 + pad) - y,
        label: highlights.length === 0 ? "Altered after the original" : undefined,
      });
    }
    if (highlights.length === 0) return { evidence, highlights };
    evidence.push({
      id: "revision-diff",
      signal: "revision-diff",
      severity: "critical",
      title: "Rebuilt the original and located the change",
      detail:
        "Attesta reconstructed the document's first saved version from the file and compared it to the current one. The boxed region on the page is exactly what changed after the original was written.",
      weight: 0.55,
    });
  } catch {
    // Best effort. A failed diff never blocks the verdict.
  }
  return { evidence, highlights };
}
