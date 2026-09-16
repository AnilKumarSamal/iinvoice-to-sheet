import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://invoice.checkforge.in"),
  title: "CheckForge Bills | Turn Invoices & Receipts Into Excel Spreadsheets",
  description:
    "Instantly extract line items, prices, quantities, and taxes from store bills, thermal receipts, or WhatsApp order screenshots into a clean .XLSX file.",
  keywords: [
    "invoice to excel converter",
    "receipt parser ai",
    "extract bill to spreadsheet",
    "whatsapp order to xlsx",
    "CheckForge bills",
    "ocr invoice extraction",
  ],
  authors: [{ name: "CheckForge" }],
  creator: "CheckForge",
  publisher: "CheckForge",
  openGraph: {
    type: "website",
    url: "https://invoice.checkforge.in",
    title: "CheckForge Bills | Invoice & Receipt to Excel Converter",
    description:
      "Automated document extraction engine built for store owners, D2C sellers, and accounting teams. Turn photos into formatted Excel sheets in seconds.",
    siteName: "CheckForge Bills",
    images: [
      {
        url: "/og-preview.png", // Place a 1200x630 preview image in your public folder
        width: 1200,
        height: 630,
        alt: "CheckForge Bills - Invoice to Excel Converter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CheckForge Bills | Turn Invoices Into Excel Spreadsheets",
    description:
      "Instantly parse store receipts, thermal bills, and order screenshots into clean, formatted .XLSX files.",
    images: ["/og-preview.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
