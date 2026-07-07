# Design System

The demo must look like it belongs next to the Attesta pitch deck. Same restraint, same palette, same clean type. A verifier is a trust product, so the UI should feel calm, precise, and evidence-forward, not flashy.

---

## Palette (Adobe brand)

Core:
- Black `#000000`
- White `#FFFFFF`
- Adobe red `#EB1000` (primary accent, use sparingly and with intent)

Grays:
- `#292929` (near-black surfaces, dark cards)
- `#5F5F5F` (secondary text)
- `#BDBDBD` (borders, muted fills)
- `#F2F2F2` (light card fill, subtle surfaces)

Use color with restraint. Most of the UI is black text on white with generous whitespace. Red marks the one thing that matters in a given view (the brand, a critical finding, a primary action). Do not decorate.

---

## Verdict color language

A live verifier needs verdicts to be readable across a room in under a second. Two acceptable options; pick one and be consistent.

**Option A (recommended for the live demo): restrained semantic verdict colors, brand everywhere else.**
- Authentic: a confident but muted green, for example `#1A7F37`, with a check.
- Unknown: gray `#5F5F5F`, with a question mark.
- Tampered: Adobe red `#EB1000`, with an alert mark.
- AI-generated: a warning amber, for example `#B25E00` (or dark `#292929` if you prefer strict two-tone), with a distinct mark.
Rationale: the verdict is the one place where semantic color genuinely aids comprehension in a live setting. Keep every other surface (chrome, cards, type, the rest of the UI) strictly on the Adobe palette so the semantic colors read as functional signal, not decoration.

**Option B (strict brand, matches the deck exactly): black/white/red/gray only.**
- Authentic: white chip, black outline, black text.
- Unknown: `#BDBDBD` fill, black text.
- Tampered: `#EB1000` fill, white text.
- AI-generated: `#292929` fill, white text.
Use this if you want the demo and deck to be pixel-cousins.

Default to Option A for legibility unless the presenter prefers strict brand. Whichever you choose, the confidence, evidence, and highlights carry the real weight; color is a fast label, not the argument.

---

## Typography

- Preferred: **Adobe Clean**, via Adobe Fonts (Typekit) if a kit is available on the Adobe account. Headlines in Adobe Clean bold or ExtraBold.
- Fallback if Adobe Clean is not licensed for this deployment: `Source Sans 3` or `Inter`.
- Suggested CSS stack: `font-family: "Adobe Clean", "Source Sans 3", Inter, system-ui, -apple-system, sans-serif;`
- Scale: large confident headline for the verdict, clear hierarchy, comfortable line length. Do not crowd. Numbers and evidence should be easy to scan.

---

## Layout and components

Keep it flat: subtle rounded corners (about 6 to 10 px), thin `#BDBDBD` borders or a light `#F2F2F2` fill to separate cards, minimal or no shadow. No gradients except, if you want one premium moment, a near-black hero background (`#000000` to `#292929`) echoing the deck's dark slides.

Component notes:
- **Dropzone.** Large, obvious, centered. On drag-over, a red accent border. Below it, the three sample chips.
- **SampleChips.** Small pill buttons: "Clean invoice", "Tampered invoice", "AI-generated statement". One click loads a bundled sample. This is what lets the presenter run the demo with zero setup.
- **VerdictBadge.** The focal element of the result view. Large label, the verdict color, an icon, and the confidence. This is the thing the room looks at.
- **ConfidenceMeter.** A simple bar or percentage. Never 100%.
- **EvidenceList.** Rows, each with a severity dot (`critical` red, `warn` amber or gray, `info` gray), a short bold title, and the specific detail beneath. Ordered by severity. Include the info rows ("No Content Credential found, ran the forensic floor"). The evidence list is the credibility of the product; give it room.
- **DocumentPreview.** The rendered page (pdf.js to canvas, or the image). For Tampered results, draw highlight rectangles over the flagged regions with a red stroke and a small label. Alignment matters: use the same viewport scale for the highlight boxes as for the render.
- **Tabs.** "Forensic floor" (default, always first) and "Provenance ceiling" (secondary). The ceiling tab shows the credential summary if present, or a short line explaining Attesta did not need one. The order and emphasis encode the golden rule.
- **AuditReceipt.** A monospace block with the signed payload and signature, a copy button, and a one-line note that it can be independently verified (link to the verify page in M3).
- **ComparisonView (M2).** Two DocumentPreview + VerdictBadge pairs side by side, clean and tampered, both analyzed live. This is the money shot; make it clean and symmetric.

---

## Tone of copy

Plain, precise, confident, never breathless. "No Content Credential found. Running the forensic floor." "Saved 2 days after it was created by Microsoft Word." "Tampered, 88% confidence." Avoid marketing adjectives in the UI. Do not use em dashes in any copy; use commas, colons, or periods.

---

## Accessibility and demo-readiness

- Ensure verdict is legible without relying on color alone (icon + text label), which also protects you if a projector washes out color.
- High contrast for projection. Test on a real projector or a dimmed external display before the pitch.
- Keep the result above the fold so nobody scrolls during the live demo.
