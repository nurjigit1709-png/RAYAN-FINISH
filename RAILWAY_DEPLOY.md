# Railway Deployment Guide — Rayan Hotel

## What this package is ready for

- One Railway web service runs the Express API and serves the built React/Vite frontend.
- PostgreSQL is expected through Railway's PostgreSQL plugin via `DATABASE_URL`.
- Replit-only Vite plugins and banners were removed from the production app config.

## Railway setup

1. Push this project to GitHub.
2. Railway → New Project → Deploy from GitHub.
3. Add PostgreSQL: Railway → Add Service → Database → PostgreSQL.
4. In the app service variables add:

```env
SESSION_SECRET=replace-with-a-long-random-secret
NODE_ENV=production
BASE_PATH=/
```

Railway should provide `DATABASE_URL` automatically when PostgreSQL is attached.

## Build and start

Railway can use the included `railway.json` and `nixpacks.toml`.

Build command:

```bash
pnpm install --frozen-lockfile && pnpm --filter @workspace/db run push && NODE_ENV=production BASE_PATH=/ pnpm --filter @workspace/rayan-hotel run build && pnpm --filter @workspace/api-server run build
```

Start command:

```bash
NODE_ENV=production PORT=${PORT:-8080} node ./artifacts/api-server/dist/index.mjs
```

Health check:

```text
/api/healthz
```

## File uploads

User uploads are stored in `uploads/`. On Railway, add a Volume mounted to:

```text
/app/uploads
```

Without a Railway Volume, uploaded files can disappear after redeploys.

## Default accounts created on first start

| Email | Password | Role |
|---|---:|---|
| omurbek@rayan.kg | admin | Super Admin |
| manager@rayan.kg | manager123 | Manager |
| prog@rayan.kg | 1234 | Programmer |

Change these passwords immediately after first login.
