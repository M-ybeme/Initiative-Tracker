# Private Build Output

This folder contains a static copy of The DM's Toolbox plus any private content packs you selected.
Host it locally (`npx serve dist/private-build`) or upload to a password-protected site.

## Contents
- Core SRD-only app files (HTML, CSS, JS, data)
- Optional `private-packs/` directory with your JSON packs
- Generated manifest for quick verification

## Loading Packs
1. Start a static server in this folder (`npx serve .` or any equivalent).
2. Visit the site and open **Manage Content Packs**.
3. Import the files from `private-packs/` as needed.

## Warnings
- Do not redistribute this folder. It may contain content you licensed privately.
- Packs remain client-side; clearing browser storage removes them.
- Never commit `private-packs/` back into the public repository.

No packs bundled.