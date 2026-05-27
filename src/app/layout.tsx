import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telecode | Transaction OS",
  description:
    "Cinematic workspace infrastructure for hunters, developers, and clients managing escrow-backed digital delivery.",
  metadataBase: new URL("https://telecode.local"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)]">{children}</body>
    </html>
  );
}
