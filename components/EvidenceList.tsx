import type { EvidenceItem, Severity } from "@/lib/types";

// The evidence list is the credibility of the product. Every finding is a row,
// ordered by severity then weight, including the info rows (they make the tool
// feel thorough and honest).
const SEV_ORDER: Record<Severity, number> = { critical: 0, warn: 1, info: 2 };
const SEV_COLOR: Record<Severity, string> = {
  critical: "#EB1000",
  warn: "#B25E00",
  info: "#BDBDBD",
};
const SEV_LABEL: Record<Severity, string> = {
  critical: "Critical",
  warn: "Warning",
  info: "Info",
};

export function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  const rows = [...evidence].sort(
    (a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.weight - a.weight
  );
  return (
    <div className="rounded-card border border-ink-300 bg-white">
      <div className="border-b border-ink-100 px-5 py-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-black">
          Evidence
        </h3>
        <p className="text-xs text-ink-500">
          {evidence.length} finding{evidence.length === 1 ? "" : "s"} from the
          forensic floor
        </p>
      </div>
      <ul className="divide-y divide-ink-100">
        {rows.map((e) => (
          <li key={e.id} className="flex gap-3 px-5 py-3">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SEV_COLOR[e.severity] }}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-black">
                  {e.title}
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    color: SEV_COLOR[e.severity],
                    backgroundColor: `${SEV_COLOR[e.severity]}1a`,
                  }}
                >
                  {SEV_LABEL[e.severity]}
                </span>
              </div>
              <p className="mt-0.5 text-sm leading-snug text-ink-500">
                {e.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
