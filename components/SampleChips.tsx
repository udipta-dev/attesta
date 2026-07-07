"use client";

// One click loads a bundled sample. This is what lets the presenter run the
// demo with zero setup. Order matches the demo script (Beat 1: clean, then
// tampered).
export interface Sample {
  label: string;
  path: string;
  fileName: string;
}

export const SAMPLES: Sample[] = [
  {
    label: "Clean invoice",
    path: "/samples/invoice-clean.pdf",
    fileName: "invoice-clean.pdf",
  },
  {
    label: "Tampered invoice",
    path: "/samples/invoice-tampered.pdf",
    fileName: "invoice-tampered.pdf",
  },
  {
    label: "AI-generated statement",
    path: "/samples/statement-ai.pdf",
    fileName: "statement-ai.pdf",
  },
];

export function SampleChips({
  onPick,
  disabled,
}: {
  onPick: (sample: Sample) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-sm text-ink-500">Or try a sample:</span>
      {SAMPLES.map((s) => (
        <button
          key={s.path}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s)}
          className="rounded-full border border-ink-300 bg-white px-3.5 py-1.5 text-sm font-medium text-black transition-colors hover:border-black hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
