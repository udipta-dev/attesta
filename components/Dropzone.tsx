"use client";

import { useRef, useState } from "react";

// Large, obvious, centered. On drag-over, a red accent border (the one moment
// the brand red marks the primary action).
export function Dropzone({
  onFile,
  busy,
}: {
  onFile: (file: File) => void;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function pick(files: FileList | null) {
    const f = files?.[0];
    if (f) onFile(f);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-14 text-center transition-colors ${
        dragging
          ? "border-adobe bg-[#EB10000a]"
          : "border-ink-300 bg-ink-100 hover:border-ink-500"
      } ${busy ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5F5F5F"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="m9 15 3-3 3 3" />
      </svg>
      <p className="mt-3 text-base font-semibold text-black">
        Drop a document to verify
      </p>
      <p className="mt-1 text-sm text-ink-500">
        PDF, JPEG, or PNG. Nothing leaves your browser.
      </p>
    </div>
  );
}
