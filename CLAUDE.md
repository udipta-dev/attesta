# CLAUDE.md — Attesta Demo (read me first)

You are building a working web demo of **Attesta**, a document trust and verification product.
This file is your prime directive. The full spec is in `docs/PRD.md`. Deep detail is in the other `docs/*.md` files. Read `docs/PRD.md` before writing any code.

---

## What Attesta is (one paragraph)

Attesta verifies **inbound** documents. You drop in a document (an invoice, a bank statement, a filing) and Attesta returns a graduated verdict (Authentic, Unknown, Tampered, or AI-generated) with the specific evidence behind it, plus a signed receipt of the result. It is the receiver-side complement to Adobe's issuer-side content-authenticity work: Adobe helps issuers sign what goes out, Attesta verifies what comes in.

## THE GOLDEN RULE (do not violate)

**The hero flow analyzes a document that has NO Content Credential (no C2PA metadata).**
Adobe already ships a credential inspector (the Inspect tool and the Content Authenticity app). If this demo's main act is "upload a credentialed file, read its credential," it demonstrates an existing Adobe feature and proves Attesta is redundant. That would sink the pitch.

So:
- The star is the **forensic floor**: detecting tampering and AI-generation on an **un-credentialed** document using real, deterministic signals.
- When a file has no credential, the UI must say so plainly, for example: **"No Content Credential found. Running the forensic floor."** That single line is the entire product positioning.
- C2PA credential verification exists only as a clearly **secondary** "Provenance ceiling" tab. It is never the first thing shown and never the headline.

## Hard constraints

1. **Client-side only.** All analysis runs in the browser. No document ever leaves the device. This is both a reliability choice (no serverless cold starts during a live demo) and a selling point for finance, legal, and AP buyers. No backend, no database. Sample files live in `public/samples/`.
2. **Never hardcode a verdict.** Every verdict must be produced by the rules engine from real computed signals. The sample documents are crafted so the real engine reliably reaches the intended verdict (see `docs/SAMPLE_DOCS_GUIDE.md`), but the engine must actually compute it. A judge may drop in their own file.
3. **Evidence, not a black box.** Every verdict shows a list of specific findings ("saved 2 days after creation by Microsoft Word, not the issuer's system"), not just a score.
4. **Tampering is the hero signal; AI-generation is secondary and shown honestly.** Metadata is spoofable, so do not overclaim AI detection. See the honest-caveat section in `docs/PRD.md`.
5. **Brand.** Match the Attesta pitch deck: Adobe palette (black, white, Adobe red `#EB1000`, grays), clean type, flat cards. Details in `docs/DESIGN_SYSTEM.md`.
6. **Punctuation:** do not use em dashes anywhere in UI copy or code comments. Use commas, colons, parentheses, or periods.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS.
- Analysis libraries, all client-side: `pdfjs-dist` (PDF metadata, fonts, text, page rendering to canvas), raw `ArrayBuffer` scanning (incremental-update detection), the `c2pa` JS SDK (credential path), HTML canvas (image Error Level Analysis), Web Crypto API (sign and verify the receipt).
- Deploy target: Vercel (Cloudflare Pages works identically). Static, no server functions required for v1.

## Build order (see docs/PRD.md milestones for detail)

1. **M1 (hero, an evening):** dropzone, PDF metadata + date + incremental-update detection + C2PA-presence check, the rules engine, the verdict UI with evidence, the signed receipt, 3 sample docs, deploy.
2. **M2 (a day):** font-subset tamper detection with the changed region highlighted on the rendered page, the clean-versus-tampered comparison view, image ELA.
3. **M3 (stretch):** the receiver "inbox" (10 docs, 2 flagged), and a "verify this receipt" page.

Target M2 for the pitch. M3 is upside.

## How to use the docs

- `docs/PRD.md` — the full product and technical spec. Start here.
- `docs/FORENSICS_ENGINE_SPEC.md` — exact algorithm for each detector, with code. Use when building `lib/forensics/`.
- `docs/VERDICT_LOGIC.md` — the rules engine: how signals map to a verdict and confidence.
- `docs/DESIGN_SYSTEM.md` — colors, type, components, the verdict visual language.
- `docs/SAMPLE_DOCS_GUIDE.md` — how to prepare the demo documents so the engine flags them correctly.
- `docs/DEMO_SCRIPT.md` — the pitch-day flow the build must serve.
- `lib/types.ts` — the canonical data model. The engine and the UI both conform to it.
