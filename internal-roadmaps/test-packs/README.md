# Internal Test Packs

This folder stores private QA packs that never ship with the public SRD build.

## Contents

- **srd-regression-pack.json** – Automatically generated snapshot of every SRD data table (classes, subclasses, feats, backgrounds, spells, class resources, beasts, artificer infusions, etc.). Importing this pack replays the entire SRD dataset through the content-pack loader so we can regression-test merges without exposing non-SRD books.

## Regenerating the SRD pack

1. Ensure SRD source files are up to date (`data/srd/level-up-data.js`, `data/srd/spells-data.js`, and `js/generated/srd-allowlist.js`).
2. Run `node scripts/generate-srd-regression-pack.mjs` from the repo root.
3. Commit the regenerated `internal-roadmaps/test-packs/srd-regression-pack.json` if SRD data changed.

> **Reminder:** This folder stays out of any published build. Packs here are strictly for internal planning/QA. Do not distribute them publicly or bundle them with Netlify deploys.
