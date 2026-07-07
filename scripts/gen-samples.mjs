// scripts/gen-samples.mjs
// Generate the three M1 sample PDFs with GENUINE forensic signals, so the real
// engine reaches the intended verdict and nothing is hardcoded.
//
//   invoice-clean.pdf     one save generation, benign producer, dates match      -> Authentic
//   invoice-tampered.pdf  the clean invoice + a real appended incremental update  -> Tampered
//                         (2nd %%EOF/startxref, /Prev, consumer-editor producer,
//                          a later ModDate, and the total changed on the page)
//   statement-ai.pdf      one save generation, generative-tool producer           -> AI-generated
//
// PDFs are hand-built with byte-accurate xref tables so the incremental update is
// authentic bytes, not a simulation. All content is latin1 (1 byte per char), so
// string length equals byte length for offset math.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const outDir = join(root, "public", "samples");
mkdirSync(outDir, { recursive: true });

// Escape a PDF literal string: backslash and parentheses.
const esc = (s) =>
  s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

// One line of page text at (x, y) in a given font/size.
const line = (font, size, x, y, text) =>
  `BT\n/${font} ${size} Tf\n${x} ${y} Td\n(${esc(text)}) Tj\nET\n`;

function invoiceContent(amount) {
  return (
    line("F2", 22, 72, 720, "Northwind Supply Co") +
    line("F1", 10, 72, 700, "123 Harbor Road, Seattle WA 98101") +
    line("F2", 16, 72, 660, "INVOICE") +
    line("F1", 11, 72, 635, "Invoice Number: NW-2026-0417") +
    line("F1", 11, 72, 618, "Invoice Date: January 1, 2026") +
    line("F1", 11, 72, 601, "Bill To: Contoso Ltd, Accounts Payable") +
    line("F2", 11, 72, 560, "Description") +
    line("F2", 11, 430, 560, "Amount") +
    line("F1", 11, 72, 540, "Industrial fasteners, bulk order") +
    line("F1", 11, 430, 540, "$" + amount) +
    line("F2", 13, 72, 500, "Total Due: $" + amount) +
    line("F1", 9, 72, 120, "Thank you for your business. Payment due within 30 days.")
  );
}

function statementContent() {
  return (
    line("F2", 22, 72, 720, "First Meridian Bank") +
    line("F1", 10, 72, 700, "Monthly Account Statement") +
    line("F1", 11, 72, 662, "Account Holder: Jordan Rivera") +
    line("F1", 11, 72, 645, "Account Number: XXXX-8842") +
    line("F1", 11, 72, 628, "Statement Period: February 1 to February 28, 2026") +
    line("F2", 11, 72, 588, "Date") +
    line("F2", 11, 220, 588, "Description") +
    line("F2", 11, 460, 588, "Balance") +
    line("F1", 11, 72, 568, "Feb 03") +
    line("F1", 11, 220, 568, "Opening balance") +
    line("F1", 11, 460, 568, "$12,400.00") +
    line("F1", 11, 72, 551, "Feb 12") +
    line("F1", 11, 220, 551, "Deposit, payroll") +
    line("F1", 11, 460, 551, "$16,850.00") +
    line("F1", 11, 72, 534, "Feb 21") +
    line("F1", 11, 220, 534, "Payment, rent") +
    line("F1", 11, 460, 534, "$14,650.00") +
    line("F2", 12, 72, 500, "Closing Balance: $14,650.00") +
    line("F1", 9, 72, 120, "This statement was generated automatically. Retain for your records.")
  );
}

// Build a classic single-generation PDF with a byte-accurate xref table.
function buildClassicPdf({ content, producer, creator, creationDate, modDate }) {
  const clen = Buffer.byteLength(content, "latin1");
  const objects = [];
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`;
  objects[3] =
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
    `/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`;
  objects[4] = `<< /Length ${clen} >>\nstream\n${content}\nendstream`;
  objects[5] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  objects[6] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`;
  objects[7] =
    `<< /Producer (${esc(producer)}) /Creator (${esc(creator)}) ` +
    `/CreationDate (${creationDate}) /ModDate (${modDate}) >>`;
  const N = 7;

  let pdf = "%PDF-1.7\n%âãÏÓ\n";
  const offsets = [];
  for (let i = 1; i <= N; i++) {
    offsets[i] = pdf.length; // latin1: length == byte offset
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${N + 1}\n0000000000 65535 f\r\n`;
  for (let i = 1; i <= N; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n\r\n`;
  }
  pdf += `trailer\n<< /Size ${N + 1} /Root 1 0 R /Info 7 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  return { bytes: Buffer.from(pdf, "latin1"), xrefOffset };
}

// Append a REAL incremental update: rewrite the content stream (obj 4) with the
// altered total and the Info dict (obj 7) with a consumer-editor producer and a
// later ModDate. Produces a second %%EOF/startxref and a /Prev pointer.
function appendIncrementalUpdate(base, { content, producer, creator, creationDate, modDate }) {
  const baseLen = base.bytes.length;
  const clen = Buffer.byteLength(content, "latin1");
  const obj4 = `<< /Length ${clen} >>\nstream\n${content}\nendstream`;
  const obj7 =
    `<< /Producer (${esc(producer)}) /Creator (${esc(creator)}) ` +
    `/CreationDate (${creationDate}) /ModDate (${modDate}) >>`;

  let add = "";
  const off4 = baseLen + add.length;
  add += `4 0 obj\n${obj4}\nendobj\n`;
  const off7 = baseLen + add.length;
  add += `7 0 obj\n${obj7}\nendobj\n`;
  const newXref = baseLen + add.length;
  add += `xref\n`;
  add += `4 1\n${String(off4).padStart(10, "0")} 00000 n\r\n`;
  add += `7 1\n${String(off7).padStart(10, "0")} 00000 n\r\n`;
  add +=
    `trailer\n<< /Size 8 /Root 1 0 R /Info 7 0 R /Prev ${base.xrefOffset} >>\n` +
    `startxref\n${newXref}\n%%EOF\n`;
  return Buffer.concat([base.bytes, Buffer.from(add, "latin1")]);
}

// 1. Clean invoice: benign producer, CreationDate == ModDate, one generation.
const clean = buildClassicPdf({
  content: invoiceContent("4,200.00"),
  producer: "Attesta Reference Generator",
  creator: "Northwind Billing System",
  creationDate: "D:20260101090000Z",
  modDate: "D:20260101090000Z",
});
writeFileSync(join(outDir, "invoice-clean.pdf"), clean.bytes);

// 2. Tampered invoice: the exact clean bytes + an appended incremental update
//    that changes the total and swaps in a consumer-editor producer + later date.
const tampered = appendIncrementalUpdate(clean, {
  content: invoiceContent("42,000.00"),
  producer: "PDFescape Online",
  creator: "PDFescape",
  creationDate: "D:20260101090000Z",
  modDate: "D:20260103141200Z",
});
writeFileSync(join(outDir, "invoice-tampered.pdf"), tampered);

// 3. AI-generated statement: one generation, generative-tool producer trace.
const ai = buildClassicPdf({
  content: statementContent(),
  producer: "ChatGPT (OpenAI)",
  creator: "ChatGPT",
  creationDate: "D:20260215103000Z",
  modDate: "D:20260215103000Z",
});
writeFileSync(join(outDir, "statement-ai.pdf"), ai.bytes);

console.log("Wrote samples to public/samples/:");
console.log("  invoice-clean.pdf     ", clean.bytes.length, "bytes");
console.log("  invoice-tampered.pdf  ", tampered.length, "bytes");
console.log("  statement-ai.pdf      ", ai.bytes.length, "bytes");
