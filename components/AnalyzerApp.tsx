"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import { analyze } from "@/lib/forensics";
import { Dropzone } from "./Dropzone";
import { SampleChips, SAMPLES, type Sample } from "./SampleChips";
import { VerdictBadge, VERDICT_META } from "./VerdictBadge";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { EvidenceList } from "./EvidenceList";
import { DocumentPreview } from "./DocumentPreview";
import { AuditReceipt } from "./AuditReceipt";
import { Tabs, type TabKey } from "./Tabs";
import { GuidedTour } from "./GuidedTour";

type Phase = "idle" | "analyzing" | "done" | "error";
type SampleKind = "clean" | "tampered" | "ai" | "custom";

// Keep the honest progress state visible for at least this long so it does not
// flash on fast local analysis.
const MIN_PROGRESS_MS = 600;

// The self-driving walkthrough. Each step optionally requires a sample to be
// loaded and points at an element (data-tour attribute) to highlight. Written
// for a reviewer opening the URL alone, with no presenter to narrate.
interface TourStep {
  id: string;
  variant: "modal" | "bar";
  requires?: SampleKind;
  target?: string;
  title: string;
  body: string;
  cta?: string;
}

const TOUR: TourStep[] = [
  {
    id: "intro",
    variant: "modal",
    title: "Verify a document you received",
    body: "Email proves who sent a document. Nothing proves the document itself is real. Attesta checks the file, right here in your browser, and tells you if it has been tampered with, along with the evidence. This 60-second walkthrough shows you how. Nothing is uploaded; it all runs on your device.",
    cta: "Start the walkthrough",
  },
  {
    id: "clean-verdict",
    variant: "bar",
    requires: "clean",
    target: "verdict",
    title: "A genuine invoice",
    body: "Attesta read the file itself and found no signs of tampering. No credential, and no cooperation from the sender, was needed. That is the point: it works on documents that carry no seal, which is almost all of them.",
  },
  {
    id: "golden",
    variant: "bar",
    requires: "clean",
    target: "banner",
    title: "Why this is different",
    body: "This line is the whole idea. The file had no Content Credential, so Attesta ran its forensic floor instead. Existing tools can only read a seal when one already exists. Attesta works when there is none.",
  },
  {
    id: "tampered-verdict",
    variant: "bar",
    requires: "tampered",
    target: "verdict",
    title: "The same invoice, altered",
    body: "This is the same invoice with one number changed: the total went from 4,200 to 42,000. Attesta now reads Tampered, with high confidence.",
  },
  {
    id: "evidence",
    variant: "bar",
    requires: "tampered",
    target: "evidence",
    title: "It shows its work",
    body: "Not a mystery score. Three concrete tells: a consumer PDF editor touched the file, it was re-saved after creation, and saved two days later. You can see exactly why.",
  },
  {
    id: "receipt",
    variant: "bar",
    requires: "tampered",
    target: "receipt",
    title: "A signed receipt",
    body: "Every result is signed: portable, checkable proof that this exact file was verified, at this time. Think of it as the receiver-side counterpart to a Content Credential.",
  },
  {
    id: "vision",
    variant: "modal",
    requires: "tampered",
    title: "The bigger picture",
    body: "Adobe helps issuers sign what they send (C2PA). Attesta verifies what you receive, on the same rails, for documents with a seal and, more importantly, without one. The goal is for this check to live everywhere you open a document: Acrobat, the browser, your inbox, and for the AI agents that now move documents at scale. Both ends of document trust.",
    cta: "Explore on your own",
  },
];

const KIND_TO_FILE: Record<Exclude<SampleKind, "custom">, string> = {
  clean: "invoice-clean.pdf",
  tampered: "invoice-tampered.pdf",
  ai: "statement-ai.pdf",
};

function kindOf(fileName: string): SampleKind {
  if (fileName.includes("clean")) return "clean";
  if (fileName.includes("tampered")) return "tampered";
  if (fileName.includes("ai")) return "ai";
  return "custom";
}

export function AnalyzerApp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tab, setTab] = useState<TabKey>("floor");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loadedSample, setLoadedSample] = useState<SampleKind | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);

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

  const loadSample = useCallback(
    async (sample: Sample) => {
      setLoadedSample(kindOf(sample.fileName));
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

  const handleDrop = useCallback(
    (f: File) => {
      setLoadedSample("custom");
      run(f);
    },
    [run]
  );

  function reset() {
    setPhase("idle");
    setResult(null);
    setFile(null);
    setErrorMsg("");
    setLoadedSample(null);
  }

  // Auto-start the walkthrough once on first load (this is a URL people open
  // alone, so it should introduce itself).
  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      setTourStep(0);
    }
  }, []);

  // When a tour step needs a specific sample and it is not the one loaded, load it.
  useEffect(() => {
    if (tourStep === null) return;
    const step = TOUR[tourStep];
    if (
      step.requires &&
      step.requires !== "custom" &&
      loadedSample !== step.requires
    ) {
      const sample = SAMPLES.find(
        (s) => s.fileName === KIND_TO_FILE[step.requires as "clean" | "tampered" | "ai"]
      );
      if (sample) loadSample(sample);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep]);

  // Highlight the element the current step points at, once its result is shown.
  useEffect(() => {
    document
      .querySelectorAll(".tour-active")
      .forEach((el) => el.classList.remove("tour-active"));
    if (tourStep === null) return;
    const step = TOUR[tourStep];
    if (!step.target) return;
    if (step.requires && phase !== "done") return; // wait for the result to render
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      el.classList.add("tour-active");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [tourStep, phase, result, tab]);

  const endTour = () => setTourStep(null);
  const nextStep = () =>
    setTourStep((s) =>
      s === null ? null : s < TOUR.length - 1 ? s + 1 : null
    );
  const prevStep = () =>
    setTourStep((s) => (s === null ? null : Math.max(0, s - 1)));
  const replayTour = () => setTourStep(0);

  const step = tourStep === null ? null : TOUR[tourStep];
  const stepLoading = !!(step?.requires && phase !== "done" && phase !== "error");

  function renderMain() {
    if (phase === "idle") {
      return (
        <div className="mx-auto w-full max-w-2xl">
          <Dropzone onFile={handleDrop} />
          <div className="mt-4">
            <SampleChips onPick={loadSample} />
          </div>
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={replayTour}
              className="text-sm font-semibold text-adobe hover:underline"
            >
              Take the 60-second guided tour
            </button>
          </div>
        </div>
      );
    }

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
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={replayTour}
              className="rounded-md px-3 py-2 text-sm font-semibold text-ink-500 hover:text-black"
            >
              Replay tour
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-ink-300 bg-white px-3.5 py-2 text-sm font-semibold text-black hover:bg-ink-100"
            >
              Analyze another
            </button>
          </div>
        </div>

        {/* The golden-rule line: the entire product positioning. */}
        {!result.hasCredential ? (
          <div
            data-tour="banner"
            className="mb-5 flex items-start gap-3 rounded-card border border-ink-300 border-l-4 border-l-adobe bg-white px-4 py-3"
          >
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
              <div data-tour="verdict">
                <VerdictBadge verdict={result.verdict} />
              </div>
              <ConfidenceMeter value={result.confidence} hex={meta.hex} />
              <div data-tour="evidence">
                <EvidenceList evidence={result.evidence} />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <DocumentPreview
                file={file}
                docType={result.docType}
                highlights={result.highlights}
              />
              <div data-tour="receipt">
                <AuditReceipt receipt={result.receipt} />
              </div>
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
                This document arrived with no C2PA content credential, which is
                the common case today. Attesta did not need one. It verified the
                document with the forensic floor, shown on the first tab. When a
                credential is present, Attesta reads and summarizes it here.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Leave room at the bottom so the coach bar never covers content. */}
      <div className={step?.variant === "bar" ? "pb-44" : ""}>{renderMain()}</div>
      {step ? (
        <GuidedTour
          variant={step.variant}
          title={step.title}
          body={step.body}
          stepIndex={tourStep ?? 0}
          total={TOUR.length}
          loading={stepLoading}
          isLast={tourStep === TOUR.length - 1}
          ctaLabel={step.cta}
          showBack={(tourStep ?? 0) > 0}
          onNext={nextStep}
          onBack={prevStep}
          onSkip={endTour}
        />
      ) : null}
    </>
  );
}
