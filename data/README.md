# Data Bundles

This directory stores the raw content bundles that feed the toolbox. The structure keeps the SRD 5.1 baseline physically separate from any future content packs so we can ship a safe public build while letting private packs live side by side.

```
data/
├── srd/                # Canonical SRD 5.1 datasets loaded by default
│   ├── spells-data.js  # Spell definitions exposed as window.SPELLS_DATA
│   └── level-up-data.js# Class/feat/background/etc. tables (window.LevelUpData)
└── packs/
    └── experimental/   # Placeholder for non-SRD packs during development
```

SRD files attach themselves to the same global variables the app already expects, so existing code keeps working even though the files moved. When we add packs, each pack file should export a function that can merge into the runtime registries without mutating the SRD source of truth.
