# Brazil Investment Comparison

Compare of **Tesouro Selic**, **Ibovespa (IBOV)** and **CDI** with a single chart.

## Run

### Docker (single container, recommended for VPS)

```bash
docker build -t investment .
docker run -p 3001:3001 investment
```

App available at http://localhost:3001. Override port: `-p 80:3001` or `-e PORT=80`.

### Local development

1. Install dependencies (root + client + server):
   ```bash
   npm install
   cd client && npm install && cd ..
   cd server && npm install && cd ..
   ```

2. Start backend and frontend:
   ```bash
   npm run dev
   ```
   - API: http://localhost:3001
   - App: http://localhost:5173 (Vite proxy forwards `/api` to the server)

Or run separately:
   ```bash
   npm run dev:server   # terminal 1
   npm run dev:client   # terminal 2
   ```
   If you run only the client, set the API base in the app to `http://localhost:3001` or use the proxy (client must be started with `npm run dev` from `client/` and proxy target 3001).

## Data sources

- **Tesouro Selic / CDI:** Banco Central (BCB) SGS API (series 4189, 12).
- **Ibovespa:** Yahoo Finance (^BVSP), via backend proxy (CORS).

## Stack

- **Frontend:** React (Vite + TypeScript), Tailwind CSS, Recharts. File names use kebab-case (e.g. `period-selector.tsx`, `fetch-comparison.ts`).
- **Backend:** Express (TypeScript), axios, cors. Run with `tsx`.
