// lib/forensics/c2pa.ts
// The C2PA credential check (the "ceiling"). It runs first and only decides
// hasCredential. It never blocks or headlines the forensic floor. Loaded lazily
// and wrapped in try/catch: if the WASM or worker fails to load, we degrade to
// hasCredential:false, which is exactly the hero path (an un-credentialed file).

import type { CredentialResult } from "../types";

export async function checkCredential(file: File): Promise<CredentialResult> {
  try {
    const { createC2pa } = await import("c2pa");
    const c2pa = await createC2pa({
      wasmSrc: "/c2pa/toolkit_bg.wasm",
      workerSrc: "/c2pa/c2pa.worker.min.js",
    });
    const result = await c2pa.read(file);
    const manifestStore = result?.manifestStore;
    if (!manifestStore || !manifestStore.activeManifest) {
      return { hasCredential: false };
    }
    const m = manifestStore.activeManifest;
    const issuer = m.signatureInfo?.issuer ?? "unknown issuer";
    const generator =
      typeof m.claimGenerator === "string" ? m.claimGenerator : "unknown";
    return {
      hasCredential: true,
      valid: true,
      summary: `Signed by ${issuer}. Claim generator: ${generator}.`,
    };
  } catch {
    return { hasCredential: false };
  }
}
