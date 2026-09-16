"use client";

import { useState, useRef } from "react";

// --- Sample Image Generator Utility ---
const createSampleImage = (
  type: "supermarket" | "restaurant" | "whatsapp",
): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Paper background
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(0, 0, 600, 800);

      // Receipt Header
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";

      if (type === "supermarket") {
        ctx.fillText("SPICE & GRAIN SUPERMARKET", 300, 60);
        ctx.font = "14px monospace";
        ctx.fillStyle = "#64748B";
        ctx.fillText("Date: 2026-09-16 | Receipt #4092", 300, 90);

        ctx.textAlign = "left";
        ctx.fillStyle = "#1E293B";
        ctx.font = "15px monospace";
        ctx.fillText("1. Organic A2 Milk 1L      x2   90.00   180.00", 50, 160);
        ctx.fillText("2. Whole Wheat Bread 400g  x1   45.00    45.00", 50, 200);
        ctx.fillText("3. Cold Pressed Coconut    x1  420.00   420.00", 50, 240);
        ctx.fillText("4. Basmati Rice 5kg        x1  650.00   650.00", 50, 280);

        ctx.fillRect(50, 320, 500, 2);
        ctx.fillText("Subtotal:                        1295.00", 50, 360);
        ctx.fillText("GST (5%):                          64.76", 50, 390);
        ctx.font = "bold 18px monospace";
        ctx.fillText("Grand Total:                    1359.76", 50, 440);
      } else if (type === "restaurant") {
        ctx.fillText("THE URBAN BISTRO", 300, 60);
        ctx.font = "14px monospace";
        ctx.fillStyle = "#64748B";
        ctx.fillText("Table #04 | Staff: Rahul | 2026-09-16", 300, 90);

        ctx.textAlign = "left";
        ctx.fillStyle = "#1E293B";
        ctx.font = "15px monospace";
        ctx.fillText(
          "1. Artisanal Farmhouse Pizza x1  599.00  599.00",
          50,
          160,
        );
        ctx.fillText(
          "2. Iced Peach Tea            x2  149.00  298.00",
          50,
          200,
        );
        ctx.fillText(
          "3. Garlic Butter Pasta       x1  380.00  380.00",
          50,
          240,
        );

        ctx.fillRect(50, 280, 500, 2);
        ctx.fillText("Subtotal:                        1277.00", 50, 320);
        ctx.fillText("Service Charge (5%):               63.85", 50, 350);
        ctx.font = "bold 18px monospace";
        ctx.fillText("Grand Total:                    1340.85", 50, 400);
      } else {
        ctx.fillStyle = "#0284C7";
        ctx.fillText("WhatsApp Business Order", 300, 60);
        ctx.font = "14px monospace";
        ctx.fillStyle = "#64748B";
        ctx.fillText("Customer: Priya Sharma | Order #WA-881", 300, 90);

        ctx.textAlign = "left";
        ctx.fillStyle = "#1E293B";
        ctx.font = "15px monospace";
        ctx.fillText("Hey! Here is the order breakdown:", 50, 150);
        ctx.fillText(
          "- Oversized Heavyweight Tee  x3  999.00 2997.00",
          50,
          190,
        );
        ctx.fillText(
          "- Vintage Cargo Pants        x1 2499.00 2499.00",
          50,
          230,
        );
        ctx.fillText(
          "- Express Courier Fee        x1  150.00  150.00",
          50,
          270,
        );

        ctx.fillRect(50, 310, 500, 2);
        ctx.font = "bold 18px monospace";
        ctx.fillText("Total Payable:                  5646.00", 50, 360);
      }
    }

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], `sample_${type}.jpg`, { type: "image/jpeg" }));
      }
    }, "image/jpeg");
  });
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleLoadSample = async (
    type: "supermarket" | "restaurant" | "whatsapp",
  ) => {
    setError(null);
    const sampleFile = await createSampleImage(type);
    setFile(sampleFile);
  };

  // Compression helper
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1600;
        const scale = MAX_WIDTH / img.width;

        if (scale < 1) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85,
        );
      };
      img.onerror = () => resolve(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressedFile);

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process image.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "converted_invoice.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* --- Header --- */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-slate-950 font-black p-2 rounded-lg text-xs tracking-widest">
              CF
            </div>
            <span className="font-bold tracking-tight text-lg text-white">
              CheckForge<span className="text-emerald-400">.Bills</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#samples" className="hover:text-slate-200 transition">
              Sample Files
            </a>
            <a href="#how-it-works" className="hover:text-slate-200 transition">
              How It Works
            </a>
            <a href="#preview" className="hover:text-slate-200 transition">
              Sample Output
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              invoice.checkforge.com
            </span>
          </div>
        </div>
      </header>

      {/* --- Main Hero & Dropzone --- */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pt-12 pb-20 w-full flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium mb-6">
          <svg
            className="w-4 h-4 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Instant Vision Extraction → Clean Excel Spreadsheet
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-center tracking-tight text-white max-w-3xl leading-tight">
          Turn Messy Invoices & Orders Into Clean{" "}
          <span className="text-emerald-400">Excel Files</span>
        </h1>

        <p className="mt-4 text-slate-400 text-center max-w-2xl text-base md:text-lg">
          Upload WhatsApp order screenshots, paper store bills, or supplier
          invoices. Extract line items, prices, and taxes directly into a
          formatted .XLSX workbook.
        </p>

        {/* Dropzone Container */}
        <div className="w-full max-w-2xl mt-10">
          <form
            onSubmit={handleSubmit}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 md:p-12 transition text-center bg-slate-900/60 backdrop-blur relative overflow-hidden ${
              file
                ? "border-emerald-500/60 bg-emerald-500/5"
                : "border-slate-800 hover:border-slate-700"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/jpg"
              className="hidden"
            />

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer flex flex-col items-center justify-center py-4"
              >
                <div className="w-14 h-14 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-4 text-slate-300 border border-slate-700/50">
                  <svg
                    className="w-7 h-7 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.75"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                </div>
                <p className="text-slate-200 font-medium text-base">
                  Drop your invoice or receipt image here
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Supports PNG or JPG up to 5MB (WhatsApp screenshots, store
                  bills)
                </p>
                <button
                  type="button"
                  className="mt-6 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded-xl border border-slate-700 transition"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-2">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-3">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-white text-base">
                  {file.name}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • File ready
                </p>

                <div className="flex gap-3 mt-6 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={isUploading}
                    className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm rounded-xl border border-slate-700 transition disabled:opacity-50"
                  >
                    Change File
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                        Extracting...
                      </>
                    ) : (
                      "Convert to Excel"
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Sample Receipt Quick Loader */}
          <div id="samples" className="mt-6 flex flex-col items-center">
            <p className="text-slate-400 text-xs mb-3 font-medium">
              Don't have a file ready? Click a sample receipt below to test:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => handleLoadSample("supermarket")}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg text-xs transition flex items-center gap-1.5"
              >
                🛒 Supermarket Bill
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample("restaurant")}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg text-xs transition flex items-center gap-1.5"
              >
                🍽️ Restaurant Receipt
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample("whatsapp")}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg text-xs transition flex items-center gap-1.5"
              >
                💬 WhatsApp Order
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs text-center">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-xs">
            <svg
              className="w-3.5 h-3.5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Files are processed in memory and never stored on local storage.
          </div>
        </div>

        {/* --- How It Works --- */}
        <div id="how-it-works" className="mt-28 w-full">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 text-center mb-2">
            Automated Workflow
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-center text-white mb-12">
            How It Works in 3 Seconds
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <div className="text-emerald-400 text-xs font-bold font-mono bg-emerald-500/10 w-8 h-8 rounded-lg flex items-center justify-center mb-4">
                01
              </div>
              <h3 className="text-white font-semibold mb-2">
                Upload Any Invoice
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Drop thermal bills, handwritten lists, or WhatsApp order
                screenshots into the browser uploader.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <div className="text-emerald-400 text-xs font-bold font-mono bg-emerald-500/10 w-8 h-8 rounded-lg flex items-center justify-center mb-4">
                02
              </div>
              <h3 className="text-white font-semibold mb-2">AI Extraction</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Vision models parse line items, item quantities, unit prices,
                tax rows, and vendor metadata automatically.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <div className="text-emerald-400 text-xs font-bold font-mono bg-emerald-500/10 w-8 h-8 rounded-lg flex items-center justify-center mb-4">
                03
              </div>
              <h3 className="text-white font-semibold mb-2">
                Instant Download
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Receive an `.xlsx` workbook formatted with dynamic currency
                formatting, auto-fit columns, and total rows.
              </p>
            </div>
          </div>
        </div>

        {/* --- Before & After Comparison --- */}
        <div
          id="preview"
          className="mt-28 w-full bg-slate-900/30 border border-slate-800 rounded-3xl p-8 md:p-12"
        >
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              From Photo Chaos to Structured Excel
            </h2>
            <p className="text-slate-400 text-sm">
              Stop typing line items into spreadsheets manually.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xs text-slate-300 font-mono">
              <div className="text-slate-500 mb-3 border-b border-slate-800 pb-2 flex justify-between">
                <span>Receipt Screenshot</span>
                <span className="text-emerald-400">Input</span>
              </div>
              <p className="text-slate-400 font-bold">
                SPICE & GRAIN SUPERMARKET
              </p>
              <p className="text-slate-500 mt-1">Date: 2026-09-16</p>
              <div className="mt-3 space-y-1 text-slate-300">
                <p>1. Organic A2 Milk 1L — 2 x 90.00 = 180.00</p>
                <p>2. Whole Wheat Bread 400g — 1 x 45.00 = 45.00</p>
                <p>3. Cold Pressed Coconut Oil — 1 x 420.00 = 420.00</p>
                <p>4. Basmati Rice 5kg — 1 x 650.00 = 650.00</p>
              </div>
              <p className="mt-3 text-slate-400 border-t border-slate-800/80 pt-2">
                Subtotal: 1295.00 | Tax: 64.76
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto text-xs font-sans">
              <div className="text-slate-500 mb-3 border-b border-slate-800 pb-2 flex justify-between font-mono">
                <span>converted_invoice.xlsx</span>
                <span className="text-emerald-400">Excel Output</span>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="pb-2">Item Name</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  <tr>
                    <td className="py-2">Organic A2 Milk 1L</td>
                    <td className="text-center">2</td>
                    <td className="text-right">₹180.00</td>
                  </tr>
                  <tr>
                    <td className="py-2">Whole Wheat Bread 400g</td>
                    <td className="text-center">1</td>
                    <td className="text-right">₹45.00</td>
                  </tr>
                  <tr>
                    <td className="py-2">Cold Pressed Coconut Oil</td>
                    <td className="text-center">1</td>
                    <td className="text-right">₹420.00</td>
                  </tr>
                  <tr>
                    <td className="py-2">Basmati Rice 5kg</td>
                    <td className="text-center">1</td>
                    <td className="text-right">₹650.00</td>
                  </tr>
                  <tr className="text-slate-400">
                    <td className="pt-2">Subtotal</td>
                    <td></td>
                    <td className="text-right pt-2">₹1,295.00</td>
                  </tr>
                  <tr className="text-slate-400">
                    <td>Tax (GST)</td>
                    <td></td>
                    <td className="text-right">₹64.76</td>
                  </tr>
                  <tr className="font-bold text-emerald-400">
                    <td className="pt-1">Grand Total</td>
                    <td></td>
                    <td className="text-right pt-1 border-t border-slate-700">
                      ₹1,359.76
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* --- SaaS Footer --- */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-emerald-500 text-slate-950 font-black p-1.5 rounded text-xs">
                CF
              </div>
              <span className="font-bold text-white text-base">CheckForge</span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Automated document extraction and spreadsheet generation utility
              built for store owners and accounting teams.
            </p>
          </div>

          <div>
            <p className="font-semibold text-slate-200 mb-3 text-xs uppercase tracking-wider">
              Product
            </p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a
                  href="#samples"
                  className="hover:text-emerald-400 transition"
                >
                  Sample Files
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-emerald-400 transition"
                >
                  Extraction Process
                </a>
              </li>
              <li>
                <a
                  href="#preview"
                  className="hover:text-emerald-400 transition"
                >
                  Excel Output Specs
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-slate-200 mb-3 text-xs uppercase tracking-wider">
              Subdomains
            </p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <span className="text-slate-300 font-mono">
                  invoice.checkforge.com
                </span>
              </li>
              <li>
                <span className="text-slate-500 font-mono">
                  api.checkforge.com
                </span>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-slate-200 mb-3 text-xs uppercase tracking-wider">
              Security & Compliance
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Zero persistent data storage. Uploaded images are held strictly in
              temporary server memory and discarded immediately following
              response generation.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-6 border-t border-slate-900/80 flex flex-col md:flex-row items-center justify-between text-xs text-slate-600 gap-4">
          <p>© 2026 CheckForge. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-400 transition">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-slate-400 transition">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
