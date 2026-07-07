"use client";

// "Forensic floor" (default, always first) and "Provenance ceiling" (secondary).
// The order and emphasis encode the golden rule.
export type TabKey = "floor" | "ceiling";

export function Tabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "floor", label: "Forensic floor" },
    { key: "ceiling", label: "Provenance ceiling" },
  ];
  return (
    <div className="flex gap-1 border-b border-ink-300">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              on
                ? "border-adobe text-black"
                : "border-transparent text-ink-500 hover:text-black"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
