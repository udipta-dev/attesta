// Simple confidence bar. The engine clamps confidence below 1.0, so this never
// shows 100%. A verifier that claims certainty reads as naive.
export function ConfidenceMeter({
  value,
  hex,
}: {
  value: number;
  hex: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="rounded-card border border-ink-300 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink-500">Confidence</span>
        <span className="text-lg font-bold text-black">{pct}%</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: hex }}
        />
      </div>
    </div>
  );
}
