# IFPI Integration (Node.js + TypeScript)

Integration middleware between SAP Sales Cloud V2 and SAP Business One Service Layer, based on the provided technical specification.

## Included in this project

- Organized TypeScript + Express project structure.
- SAP B1 login flow to `https://ifpi.sboweb.site/b1s/v2/Login`.
- Session cookie management (`B1SESSION` + `ROUTEID`) for subsequent B1 calls.
- Accounts mapping (Sales Cloud -> B1 Business Partners).
- Sales Quotations mapping (Sales Cloud -> B1 Orders).
- GCP webhook-ready endpoint: `POST /api/sync/accounts`.
- Additional endpoint: `POST /api/sync/quotes`.

## Project structure

```text
src/
  app.ts
  server.ts
  config/
    env.ts
  controllers/
    sync.controller.ts
  mappers/
    account.mapper.ts
    quote.mapper.ts
  routes/
    sync.routes.ts
  services/
    sapB1.service.ts
    salesCloud.service.ts
  types/
    integration.types.ts
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Fill all required values in `.env`.

## Run

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```
