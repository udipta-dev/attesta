// lib/forensics/pdfjs.ts
// Client-only pdf.js loader. The worker file is copied into /public at build
// time (scripts/copy-assets.mjs), so its version always matches the installed
// pdfjs-dist API. Loaded lazily so pdf.js is never evaluated on the server.

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export async function getPdfjs(): Promise<typeof import("pdfjs-dist")> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjsLib;
    });
  }
  return pdfjsPromise;
}
