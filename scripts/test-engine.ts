// scripts/test-engine.ts
// Headless proof that the rules engine computes each verdict from the sample
// bytes, not from a hardcoded table. Node 25 strips the TypeScript types, so we
// import the real engine modules directly. Run: npm run test:engine
//
// This exercises the pure detectors (incremental-update byte scan, metadata
// evidence, verdict) against the generated PDFs and asserts the intended verdict.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { detectIncrementalUpdates } from "../lib/forensics/incrementalUpdates.ts";
import { buildMetaEvidence } from "../lib/forensics/pdfMeta.ts";
import { decideVerdict } from "../lib/forensics/verdict.ts";
import type { EvidenceItem } from "../lib/types.ts";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const samples = join(root, "public", "samples");

// Load pdf.js legacy build by file URL to sidestep any package exports map.
const pdfjsUrl = pathToFileURL(
  join(root, "node_modules/pdfjs-dist/legacy/build/pdf.mjs")
).href;
const pdfjs = await import(pdfjsUrl);

async function readInfo(bytes: Uint8Array) {
  const doc = await pdfjs.getDocument({
    data: bytes.slice(), // copy: pdf.js detaches the buffer it is handed
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise;
  const meta = await doc.getMetadata();
  return { info: meta.info, numPages: doc.numPages };
}

async function analyzeFile(name: string) {
  const bytes = new Uint8Array(readFileSync(join(samples, name)));
  const evidence: EvidenceItem[] = [];
  const { info, numPages } = await readInfo(bytes);
  const meta = buildMetaEvidence(info, numPages);
  evidence.push(...meta.evidence);
  evidence.push(...detectIncrementalUpdates(bytes));
  const { verdict, confidence } = decideVerdict(evidence, {
    hasCredential: false,
  });
  return { verdict, confidence, evidence, info };
}

const cases = [
  { file: "invoice-clean.pdf", expect: "authentic" },
  { file: "invoice-tampered.pdf", expect: "tampered" },
  { file: "statement-ai.pdf", expect: "ai-generated" },
];

let failed = 0;
for (const c of cases) {
  const r = await analyzeFile(c.file);
  const ok = r.verdict === c.expect;
  if (!ok) failed++;
  console.log(`\n${c.file}`);
  console.log(`  producer: ${r.info?.Producer ?? "?"}`);
  console.log(`  signals : ${r.evidence.map((e) => e.signal).join(", ")}`);
  console.log(
    `  verdict : ${r.verdict} @ ${Math.round(r.confidence * 100)}%  ` +
      `(expected ${c.expect})  ${ok ? "PASS" : "FAIL"}`
  );
}

console.log(`\n${failed === 0 ? "ALL PASS" : failed + " CASE(S) FAILED"}`);
process.exit(failed === 0 ? 0 : 1);
