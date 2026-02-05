# Content Compliance Checklist (Draft)

> ✅ The canonical version now lives in [CONTRIBUTING.md](../CONTRIBUTING.md#srd-content-compliance). Use this file for future brainstorming or changes that have not yet been promoted to the public docs.

Use this list in PR templates and code reviews once finalized. Goal: guarantee every contribution stays within SRD 5.1 or original homebrew.

1. **Source Tagging**
   - [ ] Every new race/class/spell/background/etc. includes `source` metadata referencing SRD 5.1 section/page or "Homebrew".
   - [ ] Non-SRD requests are rejected or redirected to the content-pack workflow.

2. **Text Review**
   - [ ] No verbatim text pasted from non-SRD books.
   - [ ] Rules summaries are rewritten in original language if not directly from SRD 5.1.

3. **Data Surfaces**
   - [ ] Dropdowns, tooltips, docs, exports, and diagnostics are cross-checked so they only mention SRD entities by default.
   - [ ] Screenshots and sample data in docs mirror the SRD-only feature set.

4. **Automation Hooks**
   - [ ] New data files added to the SRD allowlist manifest.
   - [ ] Tests/lint scripts run locally and in CI to confirm no non-SRD IDs slipped in.

5. **Product Identity**
   - [ ] No use of Wizards trademarks, logos, or non-SRD monsters (beholders, mind flayers, etc.).
   - [ ] If in doubt, escalate before merging.

6. **Attribution**
   - [ ] UI copy continues to include the CC BY 4.0 attribution snippet.
   - [ ] Export formats updated if new SRD data appears there.

> TODO: integrate this with `.github/PULL_REQUEST_TEMPLATE.md` once wording is locked.
