// scripts/copy-assets.mjs
// Copy the pdf.js worker (and best-effort c2pa WASM/worker) from node_modules
// into /public so their versions always match the installed packages. Runs on
// predev / prebuild. Defensive: it warns and continues rather than failing a
// build, because the hero path (an un-credentialed file) never needs c2pa.

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const publicDir = join(root, "public");

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function findFirst(dir, predicate) {
  if (!existsSync(dir)) return null;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      const hit = findFirst(full, predicate);
      if (hit) return hit;
    } else if (predicate(name)) {
      return full;
    }
  }
  return null;
}

ensureDir(publicDir);

// 1. pdf.js worker (required for PDF metadata + rendering in the browser).
try {
  const worker = join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
  if (existsSync(worker)) {
    copyFileSync(worker, join(publicDir, "pdf.worker.min.mjs"));
    console.log("[copy-assets] pdf.worker.min.mjs -> public/");
  } else {
    console.warn("[copy-assets] pdf.js worker not found at", worker);
  }
} catch (e) {
  console.warn("[copy-assets] pdf.js worker copy failed:", e.message);
}

// 2. c2pa assets (optional ceiling path). Best-effort: locate the wasm + worker
//    anywhere under node_modules/c2pa/dist and copy them to public/c2pa/.
try {
  const c2paDist = join(root, "node_modules/c2pa/dist");
  const wasm = findFirst(c2paDist, (n) => n.endsWith(".wasm"));
  const worker = findFirst(
    c2paDist,
    (n) => /worker/i.test(n) && (n.endsWith(".js") || n.endsWith(".mjs"))
  );
  if (wasm || worker) {
    ensureDir(join(publicDir, "c2pa"));
    if (wasm) {
      copyFileSync(wasm, join(publicDir, "c2pa", "toolkit_bg.wasm"));
      console.log("[copy-assets] c2pa wasm -> public/c2pa/toolkit_bg.wasm");
    }
    if (worker) {
      copyFileSync(worker, join(publicDir, "c2pa", "c2pa.worker.min.js"));
      console.log("[copy-assets] c2pa worker -> public/c2pa/c2pa.worker.min.js");
    }
  } else {
    console.warn(
      "[copy-assets] c2pa assets not found. Credential check will degrade to hasCredential:false (the hero path)."
    );
  }
} catch (e) {
  console.warn("[copy-assets] c2pa asset copy skipped:", e.message);
}
