{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install --no-frozen-lockfile && NODE_ENV=production BASE_PATH=/ pnpm --filter @workspace/rayan-hotel run build && pnpm --filter @workspace/api-server run build"
  },
  "deploy": {
    "startCommand": "NODE_ENV=production PORT=${PORT:-8080} node ./artifacts/api-server/dist/index.mjs",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
