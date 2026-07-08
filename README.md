# TrustLedger

MSMED Act 2006 compliance platform for Indian MSMEs. Track invoices, calculate compound penal interest (3× RBI repo rate) on overdue payments, send reminders, maintain buyer payment history.

## Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), Firebase Auth, Sentry
- **Frontend:** React 19, Vite 8, Tailwind CSS 4, Recharts, Firebase SDK, Sentry

## Quick Start

```bash
# install all deps (backend + frontend)
npm install

# copy env templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env   # if exists

# fill in backend/.env with your MongoDB URI and Resend API key
# fill in frontend/.env with your Firebase config

# run both servers (backend :3000, frontend :5173)
npm run dev
```

## Commands

| Command | What |
|---------|------|
| `npm run dev` | Start backend + frontend concurrently |
| `npm run build` | Build frontend for production |
| `npm run lint` | Lint frontend with oxlint |

## API

See [docs/api-contract.yaml](docs/api-contract.yaml) for the full OpenAPI 3.0 spec.
