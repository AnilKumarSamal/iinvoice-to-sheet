import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

interface LineItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InvoiceData {
  vendor_name: string | null;
  invoice_date: string | null;
  currency: string;
  line_items: LineItem[];
  subtotal: number | null;
  tax: number | null;
  grand_total: number;
}

const SYSTEM_PROMPT = `You are a precise document extraction engine. Analyze the provided image of an invoice, receipt, or WhatsApp order screenshot and extract all line items and metadata into strict JSON.

Output JSON Schema:
{
  "vendor_name": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "currency": "string (e.g. INR, USD, EUR)",
  "line_items": [
    {
      "item_name": "string",
      "quantity": number,
      "unit_price": number,
      "total_price": number
    }
  ],
  "subtotal": number or null,
  "tax": number or null,
  "grand_total": number
}

Rules:
- Output ONLY raw, valid JSON. Do not include markdown ticks (\`\`\`json), commentary, or intro text.
- If quantity is unspecified, default to 1.
- Strip currency symbols from numeric values (e.g., "₹500" -> 500).
- If text is messy or hand-written, use optical context to best infer item names and prices.
- If invoice_date is visible but not in YYYY-MM-DD format, convert it. If no date is visible, use null.
- If subtotal or tax are not explicitly printed, use null for those fields rather than guessing.
- grand_total must always be a number — if not explicitly printed, compute it as the sum of all line_item total_price values (plus tax, if known).
- Always return at least one line item.`;

function buildErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function extractInvoiceData(
  base64Image: string,
  mimeType: string,
): Promise<InvoiceData> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Server is missing GEMINI_API_KEY. Add it to your environment variables.",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Model fallback sequence to protect against demand spikes (503) or version availability errors
  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
  ];
  let raw = "";
  let lastError: unknown = null;

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      });

      const response = await model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        "Extract the structured invoice data from this image.",
      ]);

      raw = response.response.text();
      if (raw && raw.trim().length > 0) {
        break; // Successfully received JSON output
      }
    } catch (err) {
      lastError = err;
      console.warn(
        `Model ${modelName} encountered high demand or error. Retrying next model...`,
      );
    }
  }

  if (!raw) {
    throw new Error(
      `Gemini service error: ${
        lastError instanceof Error
          ? lastError.message
          : "All endpoints currently busy"
      }`,
    );
  }

  let parsed: Partial<InvoiceData>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Could not parse structured data from the invoice.");
  }

  // Defensively normalize vision outputs
  const lineItemsRaw = Array.isArray(parsed.line_items)
    ? parsed.line_items
    : [];

  const line_items: LineItem[] = lineItemsRaw.map((item) => {
    const quantity = Number((item as any).quantity) || 1;
    const unit_price = Number((item as any).unit_price) || 0;
    const total_price =
      Number((item as any).total_price) || quantity * unit_price;
    return {
      item_name: String((item as any).item_name ?? "Item"),
      quantity,
      unit_price,
      total_price,
    };
  });

  const subtotal =
    parsed.subtotal === null || parsed.subtotal === undefined
      ? null
      : Number(parsed.subtotal) || 0;

  const tax =
    parsed.tax === null || parsed.tax === undefined
      ? null
      : Number(parsed.tax) || 0;

  const computedSum = line_items.reduce(
    (sum, item) => sum + item.total_price,
    0,
  );

  const grand_total =
    Number(parsed.grand_total) ||
    (subtotal !== null ? subtotal + (tax ?? 0) : computedSum + (tax ?? 0));

  return {
    vendor_name: parsed.vendor_name ? String(parsed.vendor_name) : null,
    invoice_date: parsed.invoice_date ? String(parsed.invoice_date) : null,
    currency: parsed.currency ? String(parsed.currency) : "INR",
    line_items,
    subtotal,
    tax,
    grand_total,
  };
}

async function buildWorkbook(data: InvoiceData): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Invoice to Sheet";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Invoice", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const numFmt = `#,##0.00 "${data.currency}"`;

  // --- Title block -------------------------------------------------
  sheet.mergeCells("A1:D1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = data.vendor_name || "Unknown Vendor";
  titleCell.font = { size: 16, bold: true, color: { argb: "FF0F172A" } };

  sheet.mergeCells("A2:D2");
  const dateCell = sheet.getCell("A2");
  dateCell.value = data.invoice_date ? `Date: ${data.invoice_date}` : "";
  dateCell.font = { size: 11, italic: true, color: { argb: "FF64748B" } };

  sheet.addRow([]); // spacer row (row 3)

  // --- Header row (row 4) -------------------------------------------
  const headerRow = sheet.addRow([
    "Item Name",
    "Qty",
    "Unit Price",
    "Total Price",
  ]);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // dark slate background
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF1E293B" } },
      bottom: { style: "thin", color: { argb: "FF1E293B" } },
      left: { style: "thin", color: { argb: "FF1E293B" } },
      right: { style: "thin", color: { argb: "FF1E293B" } },
    };
  });
  headerRow.height = 22;

  // --- Data rows -------------------------------------------------
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  data.line_items.forEach((item, index) => {
    const row = sheet.addRow([
      item.item_name,
      item.quantity,
      item.unit_price,
      item.total_price,
    ]);

    const isStripe = index % 2 === 1;
    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder;
      if (isStripe) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
      if (colNumber === 1) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
      if (colNumber === 3 || colNumber === 4) {
        cell.numFmt = numFmt;
      }
    });
  });

  // --- Summary rows: Subtotal / Tax / Grand Total -------------------
  sheet.addRow([]); // spacer

  const addSummaryRow = (
    label: string,
    value: number | null,
    options: { bold?: boolean; doubleTop?: boolean } = {},
  ) => {
    if (value === null) return;
    const row = sheet.addRow(["", "", label, value]);
    row.eachCell((cell, colNumber) => {
      if (colNumber === 3) {
        cell.font = { bold: !!options.bold };
        cell.alignment = { horizontal: "right" };
      }
      if (colNumber === 4) {
        cell.font = { bold: !!options.bold };
        cell.alignment = { horizontal: "right" };
        cell.numFmt = numFmt;
        if (options.doubleTop) {
          cell.border = {
            top: { style: "double", color: { argb: "FF1E293B" } },
          };
        }
      }
    });
    return row;
  };

  addSummaryRow("Subtotal", data.subtotal);
  addSummaryRow("Tax", data.tax);
  addSummaryRow("Grand Total", data.grand_total, {
    bold: true,
    doubleTop: true,
  });

  // --- Auto-fit column widths -------------------------------------
  const headers = ["Item Name", "Qty", "Unit Price", "Total Price"];
  const summaryLabels = ["Subtotal", "Tax", "Grand Total"];
  const columnWidths = headers.map((header, colIndex) => {
    let maxLength = header.length;
    data.line_items.forEach((item) => {
      const values = [
        item.item_name,
        String(item.quantity),
        item.unit_price.toFixed(2),
        item.total_price.toFixed(2),
      ];
      maxLength = Math.max(maxLength, values[colIndex].length);
    });
    if (colIndex === 2) {
      summaryLabels.forEach((label) => {
        maxLength = Math.max(maxLength, label.length);
      });
    }
    return maxLength;
  });

  columnWidths.forEach((width, i) => {
    sheet.getColumn(i + 1).width = Math.min(Math.max(width + 4, 12), 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return buildErrorResponse("No file was uploaded.", 400);
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return buildErrorResponse("Only PNG or JPG images are supported.", 400);
    }

    if (file.size > MAX_SIZE_BYTES) {
      return buildErrorResponse("File exceeds the 5MB limit.", 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const invoiceData = await extractInvoiceData(base64Image, file.type);
    const excelBuffer = await buildWorkbook(invoiceData);

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="converted_invoice.xlsx"',
      },
    });
  } catch (error) {
    console.error("Invoice conversion failed:", error);
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return buildErrorResponse(message, 500);
  }
}
