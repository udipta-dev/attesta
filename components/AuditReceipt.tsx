"use client";

import { useState } from "react";
import type { Receipt } from "@/lib/types";

// A signed, copyable record of the verdict. It attests that Attesta produced
// this verdict for this file hash at this time. That is a real, checkable claim.
export function AuditReceipt({ receipt }: { receipt?: Receipt }) {
  const [copied, setCopied] = useState(false);
  if (!receipt) return null;
  const text = JSON.stringify(receipt, null, 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  }

  return (
    <div className="rounded-card border border-ink-300 bg-white">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-black">
            Audit receipt
          </h3>
          <p className="text-xs text-ink-500">
            Signed with ECDSA P-256. Independently verifiable.
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-ink-300 bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-ink-100"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-64 overflow-auto bg-ink-900 px-4 py-3 text-[11px] leading-relaxed text-[#F2F2F2]">
        <code className="font-mono">{text}</code>
      </pre>
    </div>
  );
}
