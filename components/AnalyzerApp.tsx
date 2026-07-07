"use client";

import { useCallback, useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import { analyze } from "@/lib/forensics";
import { Dropzone } from "./Dropzone";
import { SampleChips, type Sample } from "./SampleChips";
import { VerdictBadge, VERDICT_META } from "./VerdictBadge";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { EvidenceList } from "./EvidenceList";
import { DocumentPreview } from "./DocumentPreview";
import { AuditReceipt } from "./AuditReceipt";
import { Tabs, type TabKey } from "./Tabs";

type Phase = "idle" | "analyzing" | "done" | "error";

// Keep the honest progress state visible for at least this long so it does not
// flash on fast local analysis.
const MIN_PROGRESS_MS = 600;

export function AnalyzerApp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tab, setTab] = useState<TabKey>("floor");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const run = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setTab("floor");
    setErrorMsg("");
    setPhase("analyzing");
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const r = await analyze(f);
      const elapsed =
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
        started;
      if (elapsed < MIN_PROGRESS_MS) {
        await new Promise((res) => setTimeout(res, MIN_PROGRESS_MS - elapsed));
      }
      setResult(r);
      setPhase("done");
    } catch {
      setErrorMsg(
        "Attesta could not analyze this file. It may be encrypted, corrupt, or an unsupported type."
      );
      setPhase("error");
    }
  }, []);

  const onPickSample = useCallback(
    async (sample: Sample) => {
      try {
        const res = await fetch(sample.path);
        const blob = await res.blob();
        const f = new File([blob], sample.fileName, {
          type: "application/pdf",
        });
        run(f);
      } catch {
        setErrorMsg("Could not load the sample document.");
        setPhase("error");
      }
    },
    [run]
  );

  function reset() {
    setPhase("idle");
    setResult(null);
    setFile(null);
    setErrorMsg("");
  }

  // Landing / idle.
  if (phase === "idle") {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Dropzone onFile={run} />
        <div className="mt-4">
          <SampleChips onPick={onPickSample} />
        </div>
      </div>
    );
  }

  // Progress.
  if (phase === "analyzing") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center rounded-card border border-ink-300 bg-white px-6 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-300 border-t-adobe" />
        <p className="mt-4 text-base font-semibold text-black">
          Scanning structure, metadata, fonts
        </p>
        <p className="mt-1 text-sm text-ink-500">
          Everything runs in your browser. {file?.name}
        </p>
      </div>
    );
  }

  // Error.
  if (phase === "error") {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-card border border-ink-300 bg-white p-6 text-center">
        <p className="text-base font-semibold text-black">Analysis failed</p>
        <p className="mt-1 text-sm text-ink-500">{errorMsg}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-ink-900"
        >
          Try another document
        </button>
      </div>
    );
  }

  if (!result || !file) return null;
  const meta = VERDICT_META[result.verdict];

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs uppercase tracking-wide text-ink-500">
            Result for
          </span>
          <p className="truncate text-sm font-semibold text-black">
            {result.fileName}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 rounded-md border border-ink-300 bg-white px-3.5 py-2 text-sm font-semibold text-black hover:bg-ink-100"
        >
          Analyze another
        </button>
      </div>

      {/* The golden-rule line: the entire product positioning. */}
      {!result.hasCredential ? (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-ink-300 border-l-4 border-l-adobe bg-white px-4 py-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EB1000"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0"
            aria-hidden
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          <p className="text-sm text-black">
            <span className="font-bold">No Content Credential found.</span>{" "}
            Running the forensic floor.
          </p>
        </div>
      ) : null}

      <Tabs active={tab} onChange={setTab} />

      {tab === "floor" ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_minmax(300px,400px)]">
          <div className="flex flex-col gap-4">
            <VerdictBadge verdict={result.verdict} />
            <ConfidenceMeter value={result.confidence} hex={meta.hex} />
            <EvidenceList evidence={result.evidence} />
          </div>
          <div className="flex flex-col gap-4">
            <DocumentPreview
              file={file}
              docType={result.docType}
              highlights={result.highlights}
            />
            <AuditReceipt receipt={result.receipt} />
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-card border border-ink-300 bg-white p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-black">
            Provenance ceiling
          </h3>
          {result.hasCredential ? (
            <p className="mt-2 text-sm text-ink-500">
              {result.credentialSummary ??
                "A C2PA content credential is attached to this document."}
            </p>
          ) : (
            <p className="mt-2 max-w-prose text-sm text-ink-500">
              This document arrived with no C2PA content credential, which is the
              common case today. Attesta did not need one. It verified the
              document with the forensic floor, shown on the first tab. When a
              credential is present, Attesta reads and summarizes it here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
