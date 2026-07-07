import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Attesta — Document Verification",
  description:
    "Attesta verifies inbound documents. Drop in a document, get a graduated verdict with the evidence behind it and a signed receipt. Runs entirely in your browser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black antialiased">
        {children}
      </body>
    </html>
  );
}
