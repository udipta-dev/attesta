# Demo Script (pitch day)

The build exists to serve this ninety-second flow. If a feature does not help one of these beats, it is not needed for the pitch. Keep the whole thing under two minutes so it fits inside the presentation.

Setup: the deployed site open in a browser, full screen, loaded once so it works offline. Have the sample chips ready. Do not type file paths live.

---

## Beat 0 — the frame (10 seconds, spoken)
"Every day, finance, legal, and insurance teams receive documents they have to trust and cannot control the origin of. Email tells them who sent it. Nothing tells them whether the document itself is real. Attesta does."

## Beat 1 — the matched pair (40 seconds, the emotional core)
1. Click "Clean invoice." Attesta shows "No Content Credential found. Running the forensic floor," then returns **Authentic** with its evidence. Say: "No credential needed. It reads the document itself."
2. Click "Tampered invoice" (or show the side-by-side comparison view). Same invoice, amount altered. Attesta returns **Tampered**, highlights the changed number on the page, and lists the evidence: saved again after creation, produced by a consumer editor, the edited number in a different font. Say: "Same document, one number changed. Attesta caught it, and it shows exactly why."

This contrast is the moment that lands. Rehearse it until it is smooth.

## Beat 2 — the receipt (15 seconds)
Point at the signed audit receipt. "Every verdict is signed and independently verifiable. That is the trust layer, not just a score." (If M3 is built, paste the receipt into the verify page and show it validate.)

## Beat 3 — the strategic point (20 seconds, spoken, optional inbox visual)
If the inbox is built: click it, show Attesta auto-flag the 2 bad invoices in a stream of 10. Say: "This is receiver-side, at inbox scale. Adobe helps issuers sign what goes out. Attesta verifies what comes in, on the same C2PA and Acrobat Sign foundation. It is the complement to CAFE, not a competitor."
If the inbox is not built, say the same lines over the single-document result.

## Beat 4 — the honest close (10 seconds)
"This prototype runs real forensic signals and proves the wedge. Making it robust against adversarial tampering across every document type is the work the investment funds."

---

## If a judge asks "isn't this just the Inspect tool / credential reading?"
"No. The Inspect tool reads a credential when one exists. The whole point of Attesta is the document that arrives with no credential, which is almost all of them today. That is the forensic floor you just saw, and it is what nothing at Adobe does yet."

## If a judge asks "how reliable is the AI-generation detection?"
"Less reliable than the tamper detection, and we say so in the product. Metadata is spoofable. Tampering, through document structure and fonts, is the strong, defensible signal, and it is the hero here. AI-generation is a secondary signal we show honestly."

## If a judge asks "what about privacy, these are sensitive documents?"
"Everything you just saw ran in the browser. No document left this laptop. For finance and legal buyers, local analysis is a feature, not a limitation."

---

## Presenter checklist
- [ ] Site loaded and cached, works offline.
- [ ] All sample chips tested on the deployed build today.
- [ ] The matched pair (Beat 1) is rehearsed and smooth.
- [ ] A backup unknown file on hand in case a judge wants to try one.
- [ ] Projector contrast checked (verdicts legible, not washed out).
