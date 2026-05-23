# Floating Island

Always-on-top Windows floating island prototype. It uses Electron for the transparent desktop window and exposes a local HTTP API on `127.0.0.1`.

## Run

```powershell
npm install
npm start
```

The default API is `http://127.0.0.1:17321`. The island automatically cycles through `idle`, `busy`, and `ask` every 5 seconds.

## External Calls

```powershell
Invoke-RestMethod http://127.0.0.1:17321/island -Method POST -ContentType 'application/json' -Body '{"action":"busy","title":"Downloading","message":"64%","progress":64}'
Invoke-RestMethod http://127.0.0.1:17321/method/ask -Method POST -ContentType 'application/json' -Body '{"title":"Need input","message":"Continue?"}'
node scripts/islandctl.js idle "Ready" "Waiting"
```

Supported actions: `busy`, `idle`, `ask`.
The visible one-line title uses the request `title` when provided, otherwise it falls back to the state name.

Optional environment variables:

- `FLOATING_ISLAND_PORT`: API port, default `17321`.
- `FLOATING_ISLAND_TOKEN`: if set, requests must include `x-floating-island-token`.
