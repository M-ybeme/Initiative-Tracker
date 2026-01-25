# Experimental Content Packs

Use this folder for internal-only packs that contain non-SRD or playtest material. Nothing in here is shipped with the public SRD build—packs will eventually be loaded dynamically through the upcoming content-pack loader.

Recommended convention:
- `my-pack-name.js` exports a function like `registerMyPack()` that receives the same helpers as the SRD data files.
- Keep clear `source`, `srdCitation`, and `nonSrdReason` metadata on every entity so manifest tooling can flag anything that drifts back into the SRD bundle.
- Never import from these files directly inside UI code; always gate them behind the pack loader so we can keep the default build clean.
