"use client";

import { useEffect, useRef, useState } from "react";
import type { RegionHighlight } from "@/lib/types";
import { getPdfjs } from "@/lib/forensics/pdfjs";

const TARGET_WIDTH = 560;

// Renders the first page (PDF) or the image to a canvas, then draws any
// RegionHighlight boxes in the same coordinate space as the render so they line
// up. Highlights are empty in M1; the drawing path is ready for the M2 font and
// ELA signals.
export function DocumentPreview({
  file,
  docType,
  highlights,
}: {
  file: File;
  docType: "pdf" | "image";
  highlights: RegionHighlight[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function drawHighlights(ctx: CanvasRenderingContext2D) {
      ctx.font = "600 11px system-ui, sans-serif";
      for (const h of highlights.filter((r) => r.page === 1)) {
        // Translucent fill + bold stroke so the changed region reads instantly.
        ctx.fillStyle = "rgba(235, 16, 0, 0.14)";
        ctx.fillRect(h.x, h.y, h.width, h.height);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#EB1000";
        ctx.strokeRect(h.x, h.y, h.width, h.height);
        if (h.label) {
          const tw = ctx.measureText(h.label).width;
          const ly = h.y - 18 < 0 ? h.y + h.height + 4 : h.y - 18;
          ctx.fillStyle = "#EB1000";
          ctx.fillRect(h.x, ly, tw + 12, 16);
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(h.label, h.x + 6, ly + 12);
        }
      }
    }

    async function renderPdf() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pdfjs = await getPdfjs();
      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const scale = TARGET_WIDTH / base.width;
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext("2d");
      if (!ctx || cancelled) return;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (cancelled) return;
      drawHighlights(ctx);
    }

    async function renderImage() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image load failed"));
        img.src = url;
      });
      URL.revokeObjectURL(url);
      if (cancelled) return;
      const scale = Math.min(1, TARGET_WIDTH / img.width);
      const w = img.width * scale;
      const h = img.height * scale;
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(img, 0, 0, w, h);
      drawHighlights(ctx);
    }

    setError(null);
    (docType === "pdf" ? renderPdf() : renderImage()).catch(() => {
      if (!cancelled) setError("Could not render a preview of this document.");
    });

    return () => {
      cancelled = true;
    };
  }, [file, docType, highlights]);

  return (
    <div className="rounded-card border border-ink-300 bg-white p-3">
      <div className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-black">
        Document
      </div>
      {error ? (
        <p className="px-1 py-6 text-sm text-ink-500">{error}</p>
      ) : (
        <div className="flex justify-center overflow-auto">
          <canvas ref={canvasRef} className="rounded border border-ink-100" />
        </div>
      )}
    </div>
  );
}
