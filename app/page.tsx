import { AnalyzerApp } from "@/components/AnalyzerApp";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-ink-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold tracking-tight text-black">
              Attesta
            </span>
            <span className="h-2 w-2 rounded-full bg-adobe" aria-hidden />
          </div>
          <span className="hidden text-sm text-ink-500 sm:block">
            Receiver-side document verification
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-black sm:text-4xl">
            Verify a document you received.
          </h1>
          <p className="mt-3 text-base text-ink-500">
            Email tells you who sent a document. Attesta tells you whether the
            document itself is real. It reads the file in your browser and
            returns a graduated verdict with the evidence behind it, no
            credential required.
          </p>
        </div>

        <div className="mt-8">
          <AnalyzerApp />
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-5 py-8 text-center text-xs text-ink-500">
        Runs entirely client-side. No document leaves your device. Prototype for
        demonstration, not production robustness.
      </footer>
    </main>
  );
}
