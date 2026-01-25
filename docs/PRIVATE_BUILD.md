# Private Build Workflow

Phase 3 requires a clear path for DMs to create a local "full" build that bundles the SRD app plus their own content packs without ever committing restricted data. This guide explains that workflow and the new tooling introduced in January 2026.

---

## Overview

- **SRD stays public.** The main repository and CI-powered Netlify deploy continue to ship the SRD-only bundle.
- **Private bundles stay local.** Use `npm run build:pack` to copy the static app into `dist/private-build/` and optionally include personal content packs.
- **No redistribution.** Bundled packs are for your table only; do not publish or open PRs that include `private-packs/`.

---

## Prerequisites

1. Node.js 20+
2. Dependencies installed (`npm install`)
3. One or more content packs that follow [schemas/content-pack.schema.json](../schemas/content-pack.schema.json)

---

## Command Reference

```bash
# SRD-only private bundle
npm run build:pack

# Bundle with personal packs (note the double dash before options)
npm run build:pack -- --packs "~/packs/eberron.json,~/packs/ravnica.json"

# Custom output directory
npm run build:pack -- --packs "packs/homebrew.json" --output "./dist/my-bundle"
```

### What the command does

1. Clears the output directory (default: `dist/private-build/`).
2. Copies all static app assets (HTML, CSS, JS, data, images) into the output.
3. Copies each pack into `private-packs/`, recording SHA-256 hashes in `private-packs/manifest.json`.
4. Writes `PRIVATE_BUILD.md` so anyone running the bundle knows how to host it and import packs via the **Manage Content Packs** dialog.

### After running

```text
dist/private-build/
├── PRIVATE_BUILD.md
├── battlemap.html
├── ... (all other app files)
└── private-packs/
    ├── README.md
    ├── manifest.json
    ├── eberron.json
    └── ravnica.json
```

Serve that folder locally (for example, `npx serve dist/private-build`) or upload it to a password-protected host you control. When the site loads, open **Manage Content Packs → Import** and pull the included pack files from `private-packs/`.

---

## Hosting & Access Controls

The private bundle may contain non-SRD data. Only host it in environments that you fully control and that require authentication.

### Option 1 — Local or LAN-only
- Run `npx serve dist/private-build` (or any static server) on a laptop that stays at the table.
- Share over Wi-Fi only if your network is private and trusted.

### Option 2 — Netlify with Basic Auth
1. In the Netlify dashboard, enable **Site-wide password** (Settings → General → Site protection).
2. Alternatively, drop an `_headers` file into `dist/private-build/` before uploading:
     ```
     /*
         Basic-Auth: trusteddm:srdonly
         Cache-Control: no-store
     ```
     Netlify will enforce HTTP Basic Auth with the credentials you choose.

### Option 3 — Self-hosted (NGINX/Apache/Caddy)
- Serve the folder behind HTTP Basic Auth (e.g., `.htpasswd` on Apache, `auth_basic` on NGINX).
- Restrict by IP if possible and use HTTPS certificates.
- Document the credentials somewhere private so only your table can access the site.

### Warning Banner
Consider adding a small banner or README in the hosted bundle stating “Contains non-SRD content. For personal table use only.” You can edit `PRIVATE_BUILD.md` inside the bundle to include the date, pack list, and a reminder not to redistribute.

---

## Safety Checklist

- **Do not commit** `dist/private-build/` or `private-packs/`.
- **Verify hashes** in `private-packs/manifest.json` before sharing with a co-DM.
- **Keep the bundle private.** Hosting it publicly violates the SRD-only promise unless the packs are empty.
- **Clear browsers** before returning to the SRD baseline (`Manage Content Packs → Remove All`).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Pack not found` error | Confirm the `--packs` path is correct; use absolute paths if necessary. |
| `build:pack failed: EACCES` | Ensure the destination directory is writable or run with a different `--output`. |
| Packs missing in modal | Remember to import them after hosting; bundling copies the files but does not auto-load them. |

Need more automation (e.g., zipping or uploading the bundle)? Track that work under Phase 3 Step 2 in `internal-roadmaps/srd-compliance-roadmap.md`.
