# Invoice → Sheet

Single-page Next.js (App Router) app that converts a photo/screenshot of an
invoice or receipt into a formatted, downloadable `.xlsx` file using
GPT-4o vision + `exceljs`.

## Setup

```bash
npm install
cp .env.example .env.local
# then edit .env.local and set OPENAI_API_KEY
npm run dev
```

Open http://localhost:3000

## How it works

1. **`app/page.tsx`** — client component with a drag-and-drop zone
   (PNG/JPG, max 5MB). On drop/select it POSTs the file as `multipart/form-data`
   to `/api/convert`, shows a spinner ("Extracting data & building
   spreadsheet...") for a minimum of 3 seconds, then triggers a browser
   download of the returned file as `converted_invoice.xlsx`.

2. **`app/api/convert/route.ts`** — Node.js route handler that:
   - Validates the uploaded file (type + size).
   - Base64-encodes the image and sends it to `gpt-4o` with a vision
     message + a strict JSON-only system prompt requesting
     `{ vendor, date, line_items[], grand_total }`.
   - Builds an in-memory `.xlsx` workbook with `exceljs`:
     - Dark header row, white bold text.
     - Zebra-striped data rows, right-aligned numeric columns, thin borders.
     - Auto-fit column widths based on content length.
     - Bold "Grand Total" row with a double top border.
   - Streams the workbook back as
     `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
     with a `Content-Disposition: attachment` header.

## Notes for production

- The route runs with `export const runtime = "nodejs"` (required — `exceljs`
  and the `openai` SDK aren't Edge-compatible) and `maxDuration = 60` to give
  the vision call room to finish on serverless platforms like Vercel.
- No files are persisted to disk or a database — everything happens
  in memory per-request.
- Swap `gpt-4o` for a cheaper vision-capable model if you want to lower
  per-conversion cost once you're past MVP validation.
- Add rate limiting (e.g. Upstash Redis) in front of `/api/convert` before
  you put this behind a paid checkout, so a single buyer can't hammer your
  OpenAI bill.
