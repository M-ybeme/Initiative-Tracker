# Licensing Overview

This folder centralizes every legal notice we need to keep the project compliant.

## Code vs. SRD Content
- **MIT License** (root `LICENSE.md`) continues to cover all original code, assets, and documentation written for the toolbox.
- **Creative Commons Attribution 4.0 (SRD 5.2)** applies to any text, stat blocks, or rule mechanics derived from Wizards of the Coast's SRD release. We must provide attribution wherever that content appears.

## Deliverables for Phase 0
1. ✅ `SRD-5.2-CC-BY-4.0.md` – authoritative copy/paste of the CC BY 4.0 legalcode bundled with the repo.
2. ✅ Attribution snippet for UI/exports (footer, modal, PDF header).
3. ✅ Product identity disclaimer describing which parts of the brand we do **not** touch (Forgotten Realms, beholders, etc.).

### Attribution Snippet (UI + Exports)

Use this statement, exactly as published in the legal section of the official SRD 5.2.1 (https://www.dndbeyond.com/srd), anywhere the app surfaces SRD-derived text (footer, diagnostics drawer, export headers, etc.). Do not paraphrase it, and do not add any other attribution to Wizards or its parent or affiliates:

> This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

It is defined once, as `attributionText` in `js/site.js`. The product identity disclaimer below is separate from this required statement.

### Product Identity Disclaimer

Add the following disclaimer to the README, docs index, and any legal footers:

> "The DM's Toolbox references rules and mechanics from the Dungeons & Dragons® 5e System Reference Document 5.2. Wizards of the Coast, Dungeons & Dragons, Forgotten Realms, Ravenloft, Eberron, the dragon ampersand, beholders, githyanki, githzerai, mind flayers, yuan-ti, and all other Wizards of the Coast product identity are trademarks of Wizards of the Coast LLC in the U.S.A. and other countries. The DM's Toolbox is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC."

This disclaimer keeps us inside the SRD license while clarifying that we avoid protected product identity (named settings, trade dress, unique monsters, etc.).

## SRD Reference PDF
- Primary source: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf (the English SRD 5.2.1 PDF linked from the official SRD page, https://www.dndbeyond.com/srd)
- The version label, this link, and the attribution and disclaimer text are defined once, in `js/site.js` (`window.getSrdLicenseNotices()`); every export and the diagnostics panel read them from there.
- The same link now renders in every app footer, the diagnostics panel, and all export formats alongside the attribution statement so players can jump straight to the official document.

## Placement Checklist
- [x] Root README (Licensing section)
- [ ] Docs landing page (`docs/README` or index)
- [x] App footer + diagnostics panel
- [x] Export surfaces (PDF/PNG/Word) – include attribution + link to CC license + SRD PDF
- [ ] Any place we display SRD snippets inside the UI (modal footers)

Keep updates scoped to this folder so reviewers can reason about licensing history in one place.
