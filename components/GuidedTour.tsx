"use client";

// A self-driving walkthrough for reviewers who open the URL alone, with no
// presenter. It renders either a centered modal (intro and closing) or a
// non-blocking bottom coach bar (the steps), and it advances through the story.
export function GuidedTour({
  variant,
  title,
  body,
  stepIndex,
  total,
  loading,
  isLast,
  ctaLabel,
  showBack,
  onNext,
  onBack,
  onSkip,
}: {
  variant: "modal" | "bar";
  title: string;
  body: string;
  stepIndex: number;
  total: number;
  loading?: boolean;
  isLast?: boolean;
  ctaLabel?: string;
  showBack?: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const nextLabel = ctaLabel ?? (isLast ? "Done" : "Next");

  const controls = (
    <div className="flex items-center gap-2">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-3 py-2 text-sm font-semibold text-ink-500 hover:text-black"
        >
          Back
        </button>
      ) : null}
      <button
        type="button"
        onClick={onNext}
        disabled={loading}
        className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Analyzing..." : nextLabel}
      </button>
    </div>
  );

  const progress = (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === stepIndex ? "w-5 bg-adobe" : "w-1.5 bg-ink-300"
          }`}
        />
      ))}
    </div>
  );

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg rounded-card border border-ink-300 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            {progress}
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-semibold text-ink-500 hover:text-black"
            >
              Skip
            </button>
          </div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-black">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{body}</p>
          <div className="mt-6 flex items-center justify-between">
            {showBack ? (
              <button
                type="button"
                onClick={onBack}
                className="text-sm font-semibold text-ink-500 hover:text-black"
              >
                Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onNext}
              disabled={loading}
              className="rounded-md bg-adobe px-5 py-2.5 text-sm font-bold text-white transition-colors hover:brightness-90 disabled:opacity-50"
            >
              {ctaLabel ?? "Start the walkthrough"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bottom coach bar, non-blocking so the reviewer can see the app behind it.
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="w-full max-w-2xl rounded-card border border-ink-300 bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          {progress}
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-semibold text-ink-500 hover:text-black"
          >
            Skip tour
          </button>
        </div>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-black">{title}</h3>
            <p className="mt-0.5 text-sm leading-snug text-ink-500">{body}</p>
          </div>
          <div className="shrink-0">{controls}</div>
        </div>
      </div>
    </div>
  );
}
