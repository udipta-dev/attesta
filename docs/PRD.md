# Attesta Demo — Product Requirements Document (PRD)

Version 1.0. Owner: Attesta team (Adobe internal incubator). Audience for this doc: the engineer (and Claude Code) building the demo.

Read `CLAUDE.md` first. This PRD is the authoritative spec. Deep implementation detail lives in the sibling docs referenced throughout.

---

## 1. Context and positioning

### 1.1 What Attesta is
Attesta is a trust and verification layer for documents in the agent era. AI agents now write, redline, and sign documents at scale, but the systems we trust today authenticate the **sender**, not the **document**. Email authentication (SPF, DKIM, DMARC) and verified numbers confirm who sent something; they say nothing about whether the content is real. Attesta closes that gap. The thesis in one line: **we authenticate the envelope, not just the letter.**

### 1.2 Two layers
- **Forensic floor (the differentiator):** detects tampering and AI-generation on **any** document, including documents with no credential and no cooperation from the sender. Works from day one, at zero adoption. This is the moat.
- **Provenance ceiling (secondary):** verifies C2PA Content Credentials on documents that carry them. Value compounds as issuers adopt credentials, but it depends on adoption, so it is not the wedge.

### 1.3 Graduated verdict
Attesta returns one of four states, never a naked pass or fail:
- **Authentic** — no evidence of tampering or synthetic origin.
- **Unknown** — not enough signal to decide; recommend manual review.
- **Tampered** — evidence the document was altered after issuance.
- **AI-generated** — evidence the document was produced by a generative tool.

Every verdict comes with a **confidence** and an **evidence list**, plus a **signed audit receipt** of the result.

### 1.4 Where it sits vs Adobe (the CAFE complement)
Adobe's content-authenticity work (CAFE, the Content Authenticity API) is **issuer-side**: it helps brands sign their own assets, focused on images and video, on the way out. Attesta is **receiver-side**: it verifies documents you receive, on the way in. Same C2PA and Acrobat Sign foundation, opposite end of the pipe. The one thing only Attesta does: verify a document that arrives with **no** credential. The demo must make that single capability unmistakable.

### 1.5 Beachhead
Receiver-side inbound verification for finance and accounts payable, legal, and insurance. These buyers receive high volumes of documents they must trust and cannot control the origin of.

### 1.6 Why this demo exists
The incubator requires a working prototype that shows, not tells. Its job is to prove three things at once: the forensic floor is technically feasible, it is differentiated from anything Adobe already ships, and it has a clean, credible user experience. It is not a production system and should not pretend to be.

---

## 2. The golden rule (repeat, because it governs everything)

**The hero flow analyzes an un-credentialed document with the forensic floor. Never build a credential inspector as the main act.** See `CLAUDE.md` for the full reasoning. When a dropped file has no C2PA manifest, show the line **"No Content Credential found. Running the forensic floor."** and proceed to the forensic analysis. The credential path is a secondary tab only.

---

## 3. Goal and audience

- **Goal:** in under two minutes of live use, make a viewer feel the gap (documents arrive untrusted), see Attesta close it (drop a document, get an evidenced verdict), and understand it is real (specific findings, a signed receipt), all on un-credentialed documents.
- **Audience:** Adobe incubator judges, plus later a design-partner conversation. Assume they are technical and skeptical, and that at least one knows the Adobe content-authenticity stack well.
- **Setting:** run live from a laptop, likely projected. Must work offline. Must not depend on a network call mid-demo.

---

## 4. User flow

### 4.1 The hero flow (single document)
1. Landing screen: a large dropzone, a one-line value statement, and three sample chips ("Clean invoice", "Tampered invoice", "AI-generated statement") so the presenter can run it with zero prep.
2. User drags in a document (or clicks a sample).
3. Attesta reads the file **in the browser**. First it checks for a C2PA credential. If none, it shows "No Content Credential found. Running the forensic floor." (This is expected for the hero docs.)
4. Analysis runs (target under about 2 seconds). A brief, honest progress state is fine ("Scanning structure, metadata, fonts").
5. Result view:
   - A large **verdict badge** (Authentic / Unknown / Tampered / AI-generated) with a confidence.
   - The **evidence list**: each finding as a row with a severity, a short title, and the specific detail.
   - The **document preview**: the rendered page. For Tampered results, the changed region is highlighted on the page.
   - The **audit receipt**: a signed, copyable receipt of the verdict, with a note that it can be independently verified.
   - A secondary **Provenance ceiling** tab: if a credential exists, summarize it; if not, explain that Attesta did not need one.

### 4.2 Beat 1, the matched pair (the emotional core)
A control that loads the **same invoice twice**, clean and with the amount altered, side by side. Clean returns Authentic. Altered returns Tampered, with the changed number highlighted on the rendered page and the matching evidence rows. This contrast is the most persuasive thing in the demo. Prioritize it (M2).

### 4.3 Beat 2, the receiver inbox (the strategic story) [stretch, M3]
An "inbox" of about 10 incoming invoices. Attesta processes them and auto-flags the 2 bad ones with verdict chips. This is the visual proof of the receiver-side motion from the pitch. It is upside, not required.

---

## 5. Functional requirements

- **FR-1 Drag-and-drop + sample loader.** Accept PDF and common image types (JPEG, PNG). Load bundled samples by click.
- **FR-2 Client-side analysis.** All parsing and analysis run in the browser. No upload. See `docs/FORENSICS_ENGINE_SPEC.md`.
- **FR-3 Credential check first.** Use the C2PA SDK to detect a manifest. Record `hasCredential`. If present, populate the ceiling tab. Never let this block or headline the floor.
- **FR-4 Forensic floor (PDF).** Compute: producer/creator metadata, CreationDate vs ModDate, incremental-update trail, and (M2) font-subset consistency with changed-region highlighting.
- **FR-5 Forensic floor (image).** Compute: EXIF software tags and Error Level Analysis with region highlighting (M2).
- **FR-6 Verdict engine.** Combine signals into a verdict + confidence + evidence list via the transparent rules in `docs/VERDICT_LOGIC.md`. No hardcoding.
- **FR-7 Verdict UI.** Badge, confidence, evidence rows, document preview with highlights.
- **FR-8 Signed receipt.** Hash the file, sign a verdict payload with Web Crypto, render a copyable receipt.
- **FR-9 Comparison view (M2).** Clean vs tampered, side by side, both analyzed live.
- **FR-10 Inbox (M3, stretch).** Batch-analyze ~10 docs, show a list with verdict chips, click through to detail.
- **FR-11 Verify-receipt page (M3, stretch).** Paste a receipt, verify its signature, show pass/fail.

---

## 6. The forensic engine (overview)

The engine is a set of independent **detectors**, each returning zero or more `EvidenceItem`s with a weight and severity. The **verdict engine** aggregates them. Full algorithms and code are in `docs/FORENSICS_ENGINE_SPEC.md`. Summary of signals:

| Detector | Signal | Catches | Strength |
|---|---|---|---|
| Incremental updates | more than one `%%EOF` / `startxref`, `/Prev` xref | file re-saved after creation | strong (with context) |
| Producer / Creator | issuer doc produced by Canva, Word, iLovePDF, a generator | wrong tool for the claimed source | strong |
| Creation vs Mod date | ModDate after CreationDate | edited after issuance | medium |
| Font subsets (M2) | changed region in a different font subset than surroundings | the classic "changed the amount" edit | strong on prepared docs, heuristic in general |
| Image ELA (M2) | re-save error-level differences in a region | edited region in a photographed/scanned doc | medium |
| C2PA (ceiling) | presence and validity of a Content Credential | provenance when it exists | strong but adoption-dependent |

Honest note baked into the product: **AI-generation** relies mostly on producer traces and image artifacts, both spoofable. Treat tampering as the hero and present AI-generation modestly. See section 13.

---

## 7. Verdict logic (summary)

A transparent rules engine, not a model. Full detail in `docs/VERDICT_LOGIC.md`. Shape:
- Start from a clean slate. Each detector contributes weighted evidence.
- **Tampered** if any strong tamper signal fires (incremental update after issuance by a different producer, or a font-subset mismatch in a content region, or an ELA-flagged region), especially in combination.
- **AI-generated** if a generative-tool producer trace or strong synthetic image artifacts dominate and tamper signals are absent.
- **Authentic** if no tamper or synthetic signals fire and metadata is internally consistent (and, if a credential exists and validates, that reinforces it).
- **Unknown** if signals are too weak or conflicting to decide. Unknown is a first-class outcome, not a failure. It is what makes the verdict "graduated."
- Confidence is a function of the strength and agreement of the signals.

---

## 8. Architecture

### 8.1 Proposed file tree
```
attesta-demo/
  app/
    layout.tsx
    page.tsx                 # hero analyzer
    inbox/page.tsx           # receiver inbox (M3)
    verify/page.tsx          # verify a receipt (M3)
    globals.css
  components/
    Dropzone.tsx
    SampleChips.tsx
    VerdictBadge.tsx
    ConfidenceMeter.tsx
    EvidenceList.tsx
    DocumentPreview.tsx      # renders a PDF/image to canvas, draws highlight boxes
    ComparisonView.tsx       # clean vs tampered (M2)
    AuditReceipt.tsx
    Tabs.tsx                 # Floor | Ceiling
  lib/
    forensics/
      index.ts               # analyze(file): Promise<AnalysisResult>
      pdfMeta.ts             # metadata + dates via pdf.js
      incrementalUpdates.ts  # ArrayBuffer byte scan
      fonts.ts               # font-subset analysis (M2)
      ela.ts                 # image error level analysis (M2)
      c2pa.ts                # credential check (ceiling)
      verdict.ts             # rules engine -> verdict, confidence, evidence
    crypto/
      receipt.ts             # sign + verify verdict receipt
    types.ts                 # canonical data model (provided)
  public/
    samples/                 # bundled demo documents (see SAMPLE_DOCS_GUIDE)
  package.json
  tailwind.config.ts
  next.config.js
```

### 8.2 Data flow
`file -> analyze() -> AnalysisResult -> UI`. `analyze()` runs C2PA check, then all applicable detectors, then `verdict.ts`, then `receipt.ts` to attach a signed receipt. The UI is a pure render of `AnalysisResult`. Keep the engine free of React so it is testable and reusable.

### 8.3 State
Local component state is enough. No global store, no persistence. The inbox (M3) holds an array of results in memory.

### 8.4 pdf.js worker note
Configure the `pdfjs-dist` worker (`GlobalWorkerOptions.workerSrc`) correctly for Next.js. Load pdf.js and c2pa **only on the client** (dynamic import, `ssr: false` where needed) since they touch browser APIs.

---

## 9. Tech stack and dependencies

- **Framework:** Next.js (App Router), TypeScript, Tailwind CSS.
- **PDF:** `pdfjs-dist`.
- **Credentials:** `c2pa` (Content Authenticity Initiative JS SDK).
- **Image forensics:** HTML canvas (no extra dep for ELA); optional `exifr` for EXIF parsing.
- **Crypto:** Web Crypto API (built in). ECDSA P-256, SHA-256.
- **Deploy:** Vercel or Cloudflare Pages. Static export is fine for v1.
- No database, no auth, no server functions in v1.

---

## 10. Design system (summary)

Match the Attesta pitch deck so the demo and deck read as one product. Palette: black `#000000`, white `#FFFFFF`, Adobe red `#EB1000`, grays `#5F5F5F`, `#BDBDBD`, `#F2F2F2`, `#292929`. Clean sans type (Adobe Clean via Adobe Fonts if available, otherwise a close fallback). Flat cards with subtle rounded corners, header-bar cards, generous whitespace. Full tokens, the verdict color language, and component specs are in `docs/DESIGN_SYSTEM.md`.

---

## 11. Sample documents (summary)

The demo is only as strong as its documents. You need at minimum: a clean invoice, its tampered twin (amount altered in a PDF editor, which genuinely produces the incremental update and font mismatch the engine catches), an AI-generated statement, and one C2PA-credentialed file for the ceiling tab. For the inbox (M3), about 10 invoices with 2 tampered. Craft each so the **real** engine reaches the intended verdict. Never hardcode. Full preparation steps in `docs/SAMPLE_DOCS_GUIDE.md`.

---

## 12. Milestones and acceptance criteria

### M1 — Hero (target: one evening)
- Dropzone + sample chips; PDF metadata, dates, incremental-update detection, C2PA-presence check; rules engine; verdict UI with evidence; signed receipt; 3 samples; deployed to Vercel.
- **Accept when:** the clean invoice returns Authentic, the tampered invoice returns Tampered with correct evidence rows, the AI sample returns AI-generated or Tampered with honest evidence, an un-credentialed file shows the "No Content Credential found" line, a receipt is produced, and the site is live. No verdict is hardcoded.

### M2 — The persuasive core (target: one day)
- Font-subset tamper detection with the changed region highlighted on the rendered page; the clean-vs-tampered comparison view; image ELA with region highlight.
- **Accept when:** the matched pair reliably shows Authentic vs Tampered side by side, the tampered region is visibly boxed on the page, and a tampered JPEG shows an ELA-highlighted region.

### M3 — Upside (stretch)
- Receiver inbox (10 docs, 2 auto-flagged) and a verify-receipt page.
- **Accept when:** the inbox flags exactly the prepared bad docs, and the verify page confirms a valid receipt and rejects a tampered one.

**Recommendation:** ship M2 for the pitch. Treat M3 as bonus.

---

## 13. The honest caveat (rehearse this for Q&A)

If a judge pushes on robustness, the answer is a strength, not an apology: *this prototype computes real but first-order forensic signals, and it proves the wedge is feasible, differentiated, and clean to use. Going deep enough to resist adversarial tampering across every document type, and to make AI-generation detection robust rather than heuristic, is exactly the R&D the investment funds.* Do not claim the demo is production-grade. Do not claim AI-generation detection is reliable. Make tampering the hero because the tamper signals (structure, fonts, ELA) are genuinely strong.

---

## 14. Non-goals (v1)

- No backend, database, accounts, or persistence.
- No training or shipping an ML model.
- No credential inspector as a headline feature.
- No claim of production robustness or legal admissibility.
- No document leaves the browser.

---

## 15. Edge cases and error handling

- Encrypted or password-protected PDF: catch, show Unknown with a clear message.
- Corrupt or non-parseable file: catch, show a friendly error, do not crash.
- Very large file: cap page rendering (analyze first N pages), keep the UI responsive.
- PNG for ELA: PNG is lossless, ELA is not meaningful; detect type and skip ELA with a note, rather than showing a false signal.
- Legitimately incremental-updated PDFs (for example, ones with a real digital signature): incremental update alone is not proof of tampering. Weight it in context (a signing tool as producer is expected; a consumer editor after issuance is suspicious). Explain this in the evidence detail so the engine looks careful, not trigger-happy.

---

## 16. Deployment

`next build` and deploy to Vercel (or Cloudflare Pages). Static export acceptable for v1. Ensure the pdf.js worker and the c2pa WASM assets are served correctly (copy to `public/` or configure asset paths). Test the deployed build offline-capably before the pitch: load the page once, then confirm sample analysis works without a live network call.

---

## 17. Appendix

- **Glossary.** C2PA: the Coalition for Content Provenance and Authenticity standard for content credentials. Content Credential: signed provenance metadata attached to a file. Incremental update: appending changes to a PDF rather than rewriting it, leaving a detectable trail. ELA: Error Level Analysis, a technique that surfaces edited regions in re-saved lossy images. CAFE: Adobe's Content Authenticity for Enterprise effort (issuer-side).
- **Related docs:** `FORENSICS_ENGINE_SPEC.md`, `VERDICT_LOGIC.md`, `DESIGN_SYSTEM.md`, `SAMPLE_DOCS_GUIDE.md`, `DEMO_SCRIPT.md`, and `lib/types.ts`.
