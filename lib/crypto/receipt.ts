// lib/crypto/receipt.ts
// Hash a file and sign a verdict payload with the Web Crypto API (ECDSA P-256,
// SHA-256). The receipt attests that Attesta produced this verdict for this file
// hash at this time. That is a real, checkable claim, and it is enough for the
// story. Do not overstate what it proves.

import type { AnalysisResult, Receipt, ReceiptPayload } from "../types";

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(d)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// One ephemeral keypair per session. Every receipt in a session shares one
// public key, so the (M3) verify page can check any of them against the key
// embedded in the receipt itself. Self-contained: the receipt carries its key.
let keyPairPromise: Promise<CryptoKeyPair> | null = null;
function getKeyPair(): Promise<CryptoKeyPair> {
  if (!keyPairPromise) {
    keyPairPromise = crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    ) as Promise<CryptoKeyPair>;
  }
  return keyPairPromise;
}

// Stable serialization so the signature covers a canonical byte string.
function canonicalPayload(p: ReceiptPayload): string {
  return JSON.stringify({
    fileHashSha256: p.fileHashSha256,
    verdict: p.verdict,
    confidence: p.confidence,
    analyzedAt: p.analyzedAt,
    issuer: p.issuer,
  });
}

function toBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export async function attachReceipt(
  result: AnalysisResult
): Promise<AnalysisResult> {
  const payload: ReceiptPayload = {
    fileHashSha256: result.fileHashSha256,
    verdict: result.verdict,
    confidence: result.confidence,
    analyzedAt: result.analyzedAt,
    issuer: "attesta-demo",
  };
  try {
    const { privateKey, publicKey } = await getKeyPair();
    const data = new TextEncoder().encode(canonicalPayload(payload));
    const sig = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      data as BufferSource
    );
    const publicKeyJwk = await crypto.subtle.exportKey("jwk", publicKey);
    const receipt: Receipt = {
      payload,
      signatureB64: toBase64(new Uint8Array(sig)),
      publicKeyJwk,
      alg: "ES256",
    };
    return { ...result, receipt };
  } catch {
    // Signing is best-effort. A missing receipt never blocks a verdict.
    return result;
  }
}

// Used by the (M3) verify page. The receipt binds the file hash, so we verify
// nothing about the file, only the signature over the payload.
export async function verifyReceipt(receipt: Receipt): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      receipt.publicKeyJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
    const data = new TextEncoder().encode(canonicalPayload(receipt.payload));
    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      fromBase64(receipt.signatureB64) as BufferSource,
      data as BufferSource
    );
  } catch {
    return false;
  }
}
