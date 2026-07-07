// lib/types.ts
// Canonical data model for the Attesta demo. The forensics engine and the UI
// both conform to this. Keep it the single source of truth.

export type Verdict = "authentic" | "unknown" | "tampered" | "ai-generated";

export type Severity = "info" | "warn" | "critical";

/** One specific finding from a detector. The `detail` string is what sells the demo. */
export interface EvidenceItem {
  id: string;                 // stable id, e.g. "incremental"
  signal: string;             // detector signal name, e.g. "incremental-update"
  severity: Severity;
  title: string;              // short human-readable headline
  detail: string;             // the specific finding, in plain language, no em dashes
  weight: number;             // 0..1 contribution toward a verdict
}

/** A region to box on the rendered document (font mismatch, ELA hotspot). */
export interface RegionHighlight {
  page: number;               // 1-based; use 1 for single images
  x: number;                  // in the same coordinate space DocumentPreview renders
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface DocMetadata {
  producer?: string;
  creator?: string;
  creationDate?: string;      // ISO
  modDate?: string;           // ISO
  pageCount?: number;
}

export interface CredentialResult {
  hasCredential: boolean;
  summary?: string;           // populated only when a credential is present
  valid?: boolean;            // if a manifest exists, did it validate
}

export interface AnalysisResult {
  fileName: string;
  fileHashSha256: string;
  docType: "pdf" | "image";
  hasCredential: boolean;
  credentialSummary?: string;
  verdict: Verdict;
  confidence: number;         // 0..1, never show as 100%
  evidence: EvidenceItem[];
  highlights: RegionHighlight[];
  metadata: DocMetadata;
  analyzedAt: string;         // ISO
  receipt?: Receipt;          // attached after verdict
}

/** Signed, independently verifiable record of a verdict. */
export interface ReceiptPayload {
  fileHashSha256: string;
  verdict: Verdict;
  confidence: number;
  analyzedAt: string;
  issuer: "attesta-demo";
}

export interface Receipt {
  payload: ReceiptPayload;
  signatureB64: string;
  publicKeyJwk: JsonWebKey;
  alg: "ES256";
}

/** Signature of every detector in lib/forensics. Pure and independent. */
export type Detector = (input: {
  bytes: Uint8Array;
  file: File;
}) => Promise<{ evidence: EvidenceItem[]; highlights?: RegionHighlight[] }>
   | { evidence: EvidenceItem[]; highlights?: RegionHighlight[] };
