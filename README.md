# Ledgerly — Client & Invoice CRM (MERN)

A clean, freelancer/agency-style CRM: manage clients, create invoices, record payments, download PDF invoices, and see a real dashboard of cash collected, awaiting and overdue.

## Stack
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, PDFKit for invoice PDFs
- **Frontend:** React (Vite), React Router, Recharts, lucide-react icons, hand-written CSS design system (no UI kit)

## Project structure
```
ledgerly/
  server/     Express API (port 5000)
  client/     React app (port 5173, proxies /api to the server)
```

## Setup

### 1. Backend
```bash
cd server
cp .env.example .env      # edit MONGO_URI / JWT_SECRET if needed
npm install
npm run dev                # starts on http://localhost:5000
```
Requires a MongoDB instance — local (`mongodb://127.0.0.1:27017/ledgerly`) or a free Atlas cluster; just point `MONGO_URI` at it.

Optional demo data:
```bash
npm run seed
# sign in with demo@ledgerly.dev / demo1234
```

### 2. Frontend
```bash
cd client
npm install
npm run dev                # starts on http://localhost:5173
```

Open http://localhost:5173, register an account (or use the seeded demo account), and you're in.

## Features
- **Auth:** register/login with JWT, each user's data (clients, invoices) is fully isolated
- **Clients:** add/edit/delete, lead/active/inactive status, notes timeline, per-client billed/paid/outstanding totals
- **Invoices:** line items, tax, discount, auto-numbering (INV-1001, INV-1002…), draft → sent → paid/overdue lifecycle, partial payments, PDF export, cancel/reopen
- **Dashboard:** collected this month vs last month, awaiting payment, overdue total, 6-month revenue chart, invoices needing attention, top clients by amount paid
- **Settings:** business profile, currency, default tax rate, invoice prefix, payment terms — used automatically on new invoices and the PDF

## Notes for customizing per client (Fiverr/Upwork gigs)
- Colors and fonts live in `client/src/styles.css` (`:root` variables) — swap `--accent` and the Google Fonts import to reskin fast.
- Currency list is in `client/src/utils.js` (`CURRENCIES`).
- PDF layout is in `server/src/utils/invoicePdf.js`, built with PDFKit — easy to add a logo (`doc.image(...)`) if a client wants one.
