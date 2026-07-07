# Sample Documents Guide

The demo lives or dies on these files. Underinvesting here is the most common way a technically fine demo falls flat. Goal: prepared documents that the **real** engine reliably classifies correctly, so you never hardcode a verdict and the demo still behaves every time. Put everything in `public/samples/`.

Principle: craft each document so its real signals trigger the intended verdict. Then let the engine compute it. If a judge drops in their own file, the engine still runs honestly.

---

## The four core documents (needed for M1 and M2)

### 1. `invoice-clean.pdf` -> should return Authentic
- A normal-looking invoice from a fictional issuer (for example "Northwind Supply Co"). Use a real invoice template and export a clean PDF once, from a single tool, without re-saving.
- It must have: a single save generation (one `%%EOF`), a consistent producer, one dominant body font, and CreationDate == ModDate (or no ModDate).
- Tip: generating it from a designed HTML or a word processor and exporting straight to PDF, without opening and re-saving, keeps it clean. Verify with the engine that it returns Authentic before the pitch.

### 2. `invoice-tampered.pdf` -> should return Tampered (the hero doc)
- Take `invoice-clean.pdf` and **edit the amount** in a consumer PDF editor (Acrobat, PDFescape, a browser editor, or LibreOffice Draw). Change, for example, the total from 4,200.00 to 42,000.00. Save.
- This single act genuinely produces the signals the engine catches:
  - an **incremental update** (a second `%%EOF` / `startxref`),
  - a **producer** string from the consumer editor,
  - a **ModDate** after the CreationDate,
  - and usually a **font-subset mismatch** on the edited number (the new glyphs come from a different subset), which drives the M2 highlight.
- Prepare it so the edited region is a clear number the highlight can box. Confirm with the engine that it returns Tampered and that the font detector highlights the changed number.
- Keep the clean and tampered versions visually almost identical so the side-by-side in Beat 1 is striking.

### 3. `statement-ai.pdf` -> should return AI-generated (or Tampered, honestly)
- Produce a bank-statement-looking document from a generative or consumer tool (an LLM export, Canva, or a generator) so the **producer** metadata carries a generative-tool trace.
- Be honest in the demo that this is the weaker signal. If it lands as Tampered rather than AI-generated because of re-save signals, that is fine and honest; the evidence explains why. Do not fight the engine to force the label.

### 4. `credentialed.pdf` or `credentialed.jpg` -> Provenance ceiling tab
- A file that carries a valid C2PA Content Credential, for the secondary tab.
- Easiest sources: sign an asset with Adobe's content-authenticity tooling, or use a known-good C2PA sample from the Content Authenticity Initiative examples. An image with a credential is fine here since the ceiling tab is format-agnostic for the demo.
- Purpose in the demo: show Attesta reads the credential when present, then immediately return to the point that the floor is what matters when there is none.

---

## For the image ELA beat (M2)

### 5. `receipt-photo.jpg` -> Tampered via ELA
- A photographed or scanned receipt/invoice as a JPEG, with a **pasted or edited region** (for example a changed number pasted in), then saved as JPEG.
- The re-saved edited region will show a different error level, so ELA highlights it. Confirm ELA lights up the right area.
- Do not use PNG for this; PNG is lossless and ELA is not meaningful (the engine will correctly skip it).

---

## For the inbox (M3, stretch)

### 6. `public/samples/inbox/` -> 10 documents, 8 clean and 2 tampered
- Reuse the recipe: 8 clean invoices (single generation, consistent producer) and 2 tampered (edited amounts). Vary issuer names and amounts so it looks like a real inbox.
- The inbox view batch-analyzes all 10 and should auto-flag exactly the 2 tampered ones. Verify before the pitch.

---

## Verification checklist before the pitch

Run each sample through the deployed build and confirm:
- [ ] `invoice-clean.pdf` -> Authentic, no critical evidence.
- [ ] `invoice-tampered.pdf` -> Tampered, with incremental-update + producer + date evidence, and (M2) the changed number highlighted.
- [ ] `statement-ai.pdf` -> AI-generated or Tampered, with honest evidence.
- [ ] `credentialed.*` -> ceiling tab shows the credential; floor still runs.
- [ ] a non-credentialed file shows "No Content Credential found. Running the forensic floor."
- [ ] `receipt-photo.jpg` -> ELA highlights the edited region.
- [ ] inbox (if built) flags exactly the 2 tampered docs.
- [ ] every verdict is produced by the engine, none hardcoded.

Keep a backup: also test one file you have never seen (ask a colleague for a random PDF) so you are confident the engine behaves on the unknown, in case a judge hands you one.
