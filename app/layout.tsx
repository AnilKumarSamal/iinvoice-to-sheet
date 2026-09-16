import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invoice → Sheet | Instant Excel from any invoice photo",
  description:
    "Drop a photo or screenshot of any invoice or receipt. Get a clean, formatted Excel spreadsheet in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased text-ink">{children}</body>
    </html>
  );
}
