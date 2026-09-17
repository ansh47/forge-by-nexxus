# {{projectNameHuman}}

Scaffolded with `forge` from the `fullstack-spring-react` template.

- `backend/` — Spring Boot (Maven), package `{{mainPackage}}`, serves the API on `:8080`
- `frontend/` — Vite + React + TypeScript, dev server on `:5173` (proxies `/api` to the backend)

## Run it

```bash
npm install       # installs the root dev-orchestration package (concurrently)
npm run dev        # runs backend + frontend together
```

Or run each side on its own:

```bash
cd backend && mvn spring-boot:run
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 — the frontend calls `GET /api/hello`, proxied to the backend, to confirm the wiring works end to end.

## Build

```bash
npm run build
```

Builds the frontend to `frontend/dist/` and packages the backend jar in `backend/target/`.
