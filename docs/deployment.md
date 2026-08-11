# Deployment

Deployment is optional. Local Docker and native Node use remain fully supported.

## Static output

```bash
pnpm install --frozen-lockfile
pnpm build
```

Upload the contents of `out/` to any static host. The application requires no server functions, database, environment variables, or secrets.

## GitHub Pages (free)

The manual workflow `.github/workflows/pages.yml` installs, tests, builds with the repository base path, and deploys `out/` with minimal permissions.

1. Confirm the repository and its entire history are safe to publish.
2. In repository settings, choose **Pages → Source → GitHub Actions**.
3. Run **Deploy static site** from the Actions tab.
4. Open the URL reported by the deployment job.

The Pages origin gets its own IndexedDB. Export JSON from any earlier origin, open Backups on the Pages site, and restore it there.

## Drag-and-drop static host

After `pnpm build`, services that accept a static folder can publish `out/` directly. Configure SPA fallback to `/index.html` if the host requires it. Do not add a database or server runtime.

## Generic local static server

```bash
pnpm build
pnpm start
```

Open `http://127.0.0.1:3000`.

## Origin and backup warning

Browser data is scoped by scheme, hostname, and port. A new domain, a switch from HTTP to HTTPS, or a different port creates a separate workspace. Before moving deployment:

1. Export complete JSON from the old origin.
2. Verify the downloaded file exists and is non-empty.
3. Open the new site and select the blank or sample start.
4. Restore the JSON from Backups.
5. Export again from the new origin to confirm portability.

Static hosting costs can be zero on GitHub Pages for an eligible public repository. Review the host’s current terms before depending on it.
