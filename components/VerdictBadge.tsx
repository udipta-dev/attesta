import type { ReactNode } from "react";
import type { Verdict } from "@/lib/types";

// Verdict visual language, Option A from docs/DESIGN_SYSTEM.md: restrained
// semantic colors, legible via icon + text label (never color alone).
export const VERDICT_META: Record<
  Verdict,
  { label: string; hex: string; note: string }
> = {
  authentic: {
    label: "Authentic",
    hex: "#1A7F37",
    note: "No evidence of tampering or synthetic origin.",
  },
  unknown: {
    label: "Unknown",
    hex: "#5F5F5F",
    note: "Not enough signal to decide. Manual review recommended.",
  },
  tampered: {
    label: "Tampered",
    hex: "#EB1000",
    note: "Evidence the document was altered after issuance.",
  },
  "ai-generated": {
    label: "AI-generated",
    hex: "#B25E00",
    note: "Evidence the document was produced by a generative tool.",
  },
};

function VerdictIcon({ verdict }: { verdict: Verdict }): ReactNode {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (verdict) {
    case "authentic":
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "tampered":
      return (
        <svg {...common}>
          <path d="M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "ai-generated":
      return (
        <svg {...common}>
          <rect x="4" y="7" width="16" height="12" rx="2" />
          <path d="M12 7V4" />
          <path d="M9 13h.01M15 13h.01" />
          <path d="M2 12h2M20 12h2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      );
  }
}

export function VerdictBadge({
  verdict,
  fileName,
}: {
  verdict: Verdict;
  fileName?: string;
}) {
  const meta = VERDICT_META[verdict];
  return (
    <div className="flex items-center gap-4 rounded-card border border-ink-300 bg-white p-5">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: meta.hex }}
        aria-hidden
      >
        <VerdictIcon verdict={verdict} />
      </div>
      <div className="min-w-0">
        {fileName ? (
          <div className="truncate text-xs uppercase tracking-wide text-ink-500">
            {fileName}
          </div>
        ) : null}
        <div
          className="text-3xl font-extrabold leading-tight"
          style={{ color: meta.hex }}
        >
          {meta.label}
        </div>
        <div className="text-sm text-ink-500">{meta.note}</div>
      </div>
    </div>
  );
}
