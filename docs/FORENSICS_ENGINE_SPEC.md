# Forensics Engine Spec

Exact behavior for each detector in `lib/forensics/`. All runs client-side. Each detector returns `EvidenceItem[]` (see `lib/types.ts`). The verdict engine (`docs/VERDICT_LOGIC.md`) aggregates them. Code below is reference, not gospel; keep the behavior, improve the code.

General rules:
- Every detector is pure and independent: `(input) => EvidenceItem[]`.
- Never throw to the top; catch and return an `info` evidence item noting the detector could not run.
- Prefer specific, human-readable `detail` strings. The detail is what sells the demo.

---

## 0. Entry point — `lib/forensics/index.ts`

```ts
import { AnalysisResult } from "../types";
import { sha256Hex } from "../crypto/receipt";
import { checkCredential } from "./c2pa";
import { readPdfMeta } from "./pdfMeta";
import { detectIncrementalUpdates } from "./incrementalUpdates";
import { analyzeFonts } from "./fonts";           // M2
import { errorLevelAnalysis } from "./ela";        // M2
import { decideVerdict } from "./verdict";
import { attachReceipt } from "../crypto/receipt";

export async function analyze(file: File): Promise<AnalysisResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileHashSha256 = await sha256Hex(bytes);
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  const credential = await checkCredential(file, bytes); // { hasCredential, summary? }
  const evidence = [];
  let metadata = {};
  const highlights = [];

  if (isPdf) {
    const meta = await readPdfMeta(bytes);          // metadata + date checks
    metadata = meta.metadata;
    evidence.push(...meta.evidence);
    evidence.push(...detectIncrementalUpdates(bytes));
    const fonts = await analyzeFonts(bytes);         // M2: may push highlights
    evidence.push(...fonts.evidence);
    highlights.push(...fonts.highlights);
  } else {
    const ela = await errorLevelAnalysis(file);      // M2: image path
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
    verdict, confidence,
    evidence, highlights, metadata,
    analyzedAt: new Date().toISOString(),
  };
  return attachReceipt(result);
}
```

---

## 1. C2PA credential check — `lib/forensics/c2pa.ts` (ceiling, runs first)

Purpose: decide `hasCredential`. Drives the golden-rule line in the UI. Never blocks the floor.

```ts
import { createC2pa } from "c2pa";
// Configure wasm + worker asset URLs served from /public (see c2pa docs).

export async function checkCredential(file: File, _bytes: Uint8Array) {
  try {
    const c2pa = await createC2pa({ /* wasmSrc, workerSrc */ });
    const { manifestStore } = await c2pa.read(file);
    if (!manifestStore || !manifestStore.activeManifest) {
      return { hasCredential: false };
    }
    const m = manifestStore.activeManifest;
    const summary = `Signed by ${m.signatureInfo?.issuer ?? "unknown issuer"}; ` +
                    `claim generator ${m.claimGenerator ?? "unknown"}.`;
    return { hasCredential: true, summary };
  } catch {
    return { hasCredential: false };
  }
}
```

UI consequence: if `hasCredential` is false (the hero case), show **"No Content Credential found. Running the forensic floor."** and continue. If true, populate the Provenance ceiling tab with `summary`, but keep the floor as the headline.

---

## 2. PDF metadata and dates — `lib/forensics/pdfMeta.ts`

Uses pdf.js `getMetadata()`. Extracts Producer, Creator, CreationDate, ModDate, page count. Produces evidence for wrong-tool and edited-after-issuance signals.

Key logic:
- Parse PDF date strings of the form `D:YYYYMMDDHHmmSS±HH'mm'`.
- **Producer/Creator check:** maintain a small list of consumer or generative tools that are red flags for a document claiming to be from an institution: for example `canva`, `word`, `microsoft`, `ilovepdf`, `smallpdf`, `pdfescape`, `libreoffice`, `google`, `figma`, and known generative tools. If the Producer or Creator matches one of these, emit a `warn`/`critical` item. (For the demo, the tampered twin will carry the consumer editor's producer string.)
- **Date check:** if ModDate exists and is meaningfully after CreationDate, emit a `warn` item ("saved 2 days after it was created"). If Producer changed between creation and last save (when detectable via XMP history), strengthen it.

```ts
import * as pdfjsLib from "pdfjs-dist";
// set pdfjsLib.GlobalWorkerOptions.workerSrc appropriately

const SUSPECT_PRODUCERS = ["canva","microsoft","word","ilovepdf","smallpdf",
  "pdfescape","libreoffice","google docs","figma","chatgpt","gpt","gemini","dall"];

function parsePdfDate(d?: string): Date | null {
  if (!d) return null;
  const m = /D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/.exec(d);
  if (!m) return null;
  const [ , y, mo, da, h="00", mi="00", s="00" ] = m;
  return new Date(Date.UTC(+y, +mo-1, +da, +h, +mi, +s));
}

export async function readPdfMeta(bytes: Uint8Array) {
  const evidence = [];
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const { info } = await doc.getMetadata();
  const producer = info?.Producer, creator = info?.Creator;
  const created = parsePdfDate(info?.CreationDate);
  const modified = parsePdfDate(info?.ModDate);

  const hay = `${producer ?? ""} ${creator ?? ""}`.toLowerCase();
  const hit = SUSPECT_PRODUCERS.find(t => hay.includes(t));
  if (hit) {
    evidence.push({ id:"producer", signal:"producer-metadata", severity:"critical",
      title:"Produced by a consumer or generative tool",
      detail:`The file reports producer "${producer ?? creator}". A document from an institution would normally be generated by that institution's system, not by ${hit}.`,
      weight: 0.6 });
  }
  if (created && modified && (modified.getTime() - created.getTime() > 60_000)) {
    const days = Math.round((modified.getTime()-created.getTime())/86_400_000);
    evidence.push({ id:"moddate", signal:"mod-after-create", severity:"warn",
      title:"Edited after it was created",
      detail:`Last saved ${days >= 1 ? days+" day(s)" : "moments"} after creation. Original issued documents are usually not re-saved.`,
      weight: 0.35 });
  }
  return { metadata: { producer, creator,
    creationDate: created?.toISOString(), modDate: modified?.toISOString(),
    pageCount: doc.numPages }, evidence };
}
```

---

## 3. Incremental-update detection — `lib/forensics/incrementalUpdates.ts`

The strongest structural tamper signal, and pure byte-scanning (no pdf.js). A PDF that has been edited and re-saved incrementally contains **more than one** `%%EOF` marker and usually more than one `startxref`. Cross-reference streams may carry a `/Prev` entry pointing at an earlier xref.

Nuance to encode (so the engine looks careful): a single incremental update is also how a legitimate digital signature is added. So report the count and interpret in context: multiple updates plus a consumer-editor producer plus a later ModDate is the tamper pattern. One update by a signing tool is expected.

```ts
export function detectIncrementalUpdates(bytes: Uint8Array) {
  const text = new TextDecoder("latin1").decode(bytes);
  const eofs = (text.match(/%%EOF/g) || []).length;
  const startxrefs = (text.match(/startxref/g) || []).length;
  const prev = /\/Prev\s+\d+/.test(text);
  const evidence = [];
  const generations = Math.max(eofs, startxrefs);
  if (generations > 1) {
    evidence.push({ id:"incremental", signal:"incremental-update", severity:"critical",
      title:"Saved again after it was created",
      detail:`The file contains ${generations} save generations${prev ? " with a linked previous version" : ""}. This means content was appended or changed after the original was written. Combined with the producer and date signals, this indicates an edit after issuance.`,
      weight: 0.6 });
  }
  return evidence;
}
```

---

## 4. Font-subset analysis — `lib/forensics/fonts.ts` (M2, the "changed the amount" signal)

When someone edits text in a PDF, the changed glyphs often end up in a **different embedded font subset** than the surrounding text (a different subset prefix like `ABCDEF+Arial`, or a different font resource entirely). This is the classic altered-number signal.

Approach with pdf.js:
- For each page, `getTextContent()` returns items; each item references a font (via `item.fontName`, resolvable through `page.commonObjs`).
- Build a map of font -> the text items using it, and their positions (transform gives x, y; width/height available).
- Heuristics to flag:
  - A numeric or currency-looking item whose font is used by **very few** items on the page while the body text uses one dominant font.
  - Two subsets of the same base family present where one covers only a small changed region.
- When flagged, emit a `critical` item and push a `RegionHighlight` (page + bounding box) so the UI can box the changed region on the rendered page.

Be explicit in comments that this is heuristic and tuned to catch the prepared tampered document reliably; it is not a general-purpose solver. That honesty matches the product framing.

```ts
// pseudocode shape
export async function analyzeFonts(bytes: Uint8Array) {
  const evidence = [], highlights = [];
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  for (let p = 1; p <= Math.min(doc.numPages, 5); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // group items by fontName; find dominant body font
    // find numeric/currency items whose font != dominant, especially rare fonts
    // for each suspect item: push evidence + highlight { page, x, y, width, height }
  }
  return { evidence, highlights };
}
```

Region coordinates: pdf.js text item transforms are in PDF user space with origin bottom-left. Convert to the canvas coordinate space you render in (`DocumentPreview.tsx`) using the same viewport/scale so the highlight box lines up.

---

## 5. Image Error Level Analysis — `lib/forensics/ela.ts` (M2, image path)

For photographed or scanned documents (JPEG). Re-compress the image at a known quality, diff against the original, amplify. Edited regions show different error levels. PNG is lossless, so skip ELA for PNG and say so (avoid a false signal).

```ts
export async function errorLevelAnalysis(file: File) {
  const evidence = [], highlights = [];
  if (file.type === "image/png") {
    evidence.push({ id:"ela-skip", signal:"ela", severity:"info",
      title:"Error Level Analysis not applicable",
      detail:"This is a lossless PNG. ELA is only meaningful on re-compressed (JPEG) images.", weight:0 });
    return { evidence, highlights };
  }
  const img = await loadImage(file);
  const c1 = drawToCanvas(img);                     // original
  const recompressed = await recompress(c1, 0.9);   // toDataURL('image/jpeg',0.9) -> reload
  const diff = amplifiedDifference(c1, recompressed); // per-pixel abs diff * scale
  // find the highest-error connected region; if strong and localized, flag + highlight
  // push evidence (medium weight) and a RegionHighlight
  return { evidence, highlights };
}
```

Keep ELA modest in weight. It is suggestive, not conclusive, and easy to over-read. The demo uses a prepared JPEG where a region was pasted, so ELA reliably lights up there.

---

## 6. Signed receipt — `lib/crypto/receipt.ts`

Purpose: turn a verdict into a verifiable artifact, the tangible "trust" tie-back.

- `sha256Hex(bytes)`: hash the file with Web Crypto.
- `attachReceipt(result)`: build a payload `{ fileHashSha256, verdict, confidence, analyzedAt, issuer:"attesta-demo" }`, sign it with an ECDSA P-256 key using Web Crypto (`crypto.subtle.sign`), attach the base64 signature and the public key (JWK). For the demo, generate an ephemeral keypair on load, or bundle a fixed demo keypair so the verify page can always check it. A fixed public key that ships with the app is simplest for the verify-receipt flow.
- Provide `verifyReceipt(receipt)` for the M3 verify page: recompute nothing about the file (the receipt binds the hash), just verify the signature over the payload with the public key.

```ts
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2,"0")).join("");
}
```

Do not overstate what the receipt proves. It attests that Attesta produced this verdict for this file hash at this time. That is a real, checkable claim and it is enough for the story.

---

## 7. Performance

- Target end-to-end analysis under about 2 seconds for the sample docs.
- Cap page-level work (fonts, rendering) to the first few pages.
- Run analysis off the main thread where practical (pdf.js already uses a worker). Keep the UI responsive with a short progress state.

## 8. Testing the engine

- Unit-test each detector against the prepared samples: clean invoice -> no critical evidence; tampered invoice -> incremental-update + producer + (M2) font evidence with a highlight; AI sample -> producer trace; credentialed file -> `hasCredential` true.
- A quick assertion suite that the matched pair yields Authentic and Tampered respectively is the single most valuable test for the demo.
