## Tax Reform Assistant

Next.js app that answers questions about Nigerian tax and business regulation using Gemini File Search over the PDFs in `data/documents/`.

### Setup

1. Create `.env.local`:
   - `GEMINI_API_KEY=...`
   - Optional: `RATE_LIMIT_PER_MINUTE=10`, `MAX_REQUEST_SIZE_KB=100`
   - Optional: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
2. Put your source PDFs in `data/documents/` (prefer filenames that include the law name + year).
3. Index documents into the Gemini File Search Store:
   - `pnpm exec tsx scripts/seed.ts`

### Run

- Dev: `pnpm dev`
- Build: `pnpm build`
- Start: `pnpm start`

### Keeping answers current (avoiding stale rates)

- Update/replace PDFs in `data/documents/` when laws change.
- If you remove/replace documents, reset and re-seed the store:
  - `pnpm exec tsx scripts/reset-store.ts`
  - `pnpm exec tsx scripts/seed.ts`
- Make sure the latest statute (and the correct tax year) is present in the document set; the assistant is instructed to ask for tax year before doing calculations and to prioritize newer sources, but it can only ground answers in what’s indexed.
