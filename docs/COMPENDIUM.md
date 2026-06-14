# Compendium (reference.html)

The Compendium is the mid-session reference hub for Dungeon Masters. It provides instant lookups for spells, monsters, rules, and conditions without leaving the browser — no internet connection required for spells, rules, and conditions. Monsters load from the Open5e API on first tab visit.

## Tabs

### Spells
- **Data**: 437 SRD 5.2 spells loaded from `data/srd/spells-data.js`.
- **Filters**: Text search (title, class, tags, body), level (Cantrip–9th), class, school, concentration (Yes/No), ritual (Yes/No).
- **Pin flow**: Click any result row to pin a spell card below the list. Click again (or the × on the card) to dismiss. Pins survive page refresh via localStorage.
- **Spell card** shows: level/school, concentration/ritual badges, casting time, range, duration, components, class list, collapsible description, and a Copy to Clipboard button.
- **Result count**: Displayed above the results list — e.g., "23 of 437".
- **Content packs**: The filter dropdowns re-populate when a content pack fires `dmtoolbox:packs-ready`, so homebrew spells appear automatically.

### Bestiary
- **Initial load**: Fetches all 322 SRD monsters in a single request from `https://api.open5e.com/v1/monsters/?document__slug=wotc-srd&limit=400`. One-shot, no pagination. Falls back to `dnd5eapi.co` if Open5e is unreachable (fallback list has names only; full stat blocks are fetched on pin).
- **Look-ahead search**: When a user types 2+ characters and pauses 300 ms, a debounced fetch hits the full Open5e dataset (3,207 monsters across all licensed sources) and merges results in — so non-SRD creatures like those from Tome of Beasts appear when searched by name.
- **Filters**: Text search (with look-ahead), CR bucket, creature type.
- **Pin flow**: Click a row to pin. Full stat block data is already in memory from the initial fetch (or the look-ahead merge). Clicking again or the × on the card dismisses it. Pins persist via localStorage.
- **Monster card** shows: size/type/alignment, CR badge, AC, HP, speed, ability score grid with modifiers, collapsible sections for saving throws, skills, damage modifiers/immunities/vulnerabilities, senses/languages, special abilities, actions, and legendary actions. Copy to Clipboard captures the full stat block as plain text.
- **Result count**: Updates live as filters change — e.g., "12 of 322 creatures".

### Rules
- **Data**: 88 entries across 16 categories in `js/rules-data.js` (SRD 5.2, 2024 PHB rules where noted).
- **Categories**: Combat (Initiative, Action Economy, Movement, Attacks, Special Situations, HP/Death), Spellcasting, Conditions, Resting, Vision, Travel, Survival, Encounters & DM Tools, Objects & Gear, Abilities & Skills, Money & Downtime.
- **Filters**: Full-text search (title, body, tags, category name) and category dropdown.
- **Pin flow**: Click a row to pin a full-width accordion card. Cards open expanded by default; click the header to collapse.
- **Result count**: Updates live as filters change — e.g., "12 of 88".

### Conditions
- **Data**: Pulled from the "Conditions" category in `js/rules-data.js` — all 15 SRD conditions rendered as always-visible cards.
- **Conditions covered**: Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious.
- **Severity badges**: Cards are labeled Deadly (Paralyzed, Stunned, Unconscious, Petrified), Severe (Frightened, Restrained, Incapacitated), or Moderate (Charmed, Invisible, Grappled) to help DMs prioritize at a glance.
- **Filter**: Typing in the filter box hides non-matching cards instantly; the count updates to show how many match.
- **No pin needed**: All conditions are always visible — the tab itself is the reference.

## Shared Behaviours

### Persistent Pins
All pinned spells, monsters, and rules are saved to `localStorage` under the key `dmtoolbox_refpins_v1` after every toggle. On page load, pins are restored before the first render, so pinned cards reappear automatically even after a browser refresh or tab close mid-session.

Pins are stored as the full object (spell payload, full monster stat block, rule body), so monster cards do not require a re-fetch on restore.

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `/` | Focus the search field on the active tab (when not already in an input) |
| `Esc` | Clear the active search field and blur it |

Both shortcuts are displayed in the subtitle line below the "Compendium" heading.

### Copy to Clipboard
Spell and monster cards each have a **Copy to Clipboard** button that writes a plain-text formatted stat block — useful for pasting into virtual tabletop chat, Discord, or session notes. The button briefly shows "Copied!" as confirmation.

## Files

| File | Purpose |
|------|---------|
| `reference.html` | Page markup — tabs, filter controls, result containers, pinned card containers |
| `js/reference.js` | All tab logic: filtering, rendering, pinning, persistence, conditions, keyboard shortcuts |
| `js/rules-data.js` | 88 SRD rule entries organized by category (includes the Conditions category) |
| `data/srd/spells-data.js` | 437 SRD spell objects |
| `js/generated/srd-allowlist.js` | SRD allowlist consumed by the filter runtime |
| `js/modules/srd-content-filter.js` | Runtime gating; filters non-SRD content before render |

## Adding New Rules or Conditions

Edit `js/rules-data.js`. Rules belong in an existing `cat` group or a new one. Conditions must stay in the `cat: "Conditions"` group to appear on the Conditions tab. The Conditions tab reads that group directly — no other changes needed.

## SRD Compliance

The Spells tab respects the SRD allowlist and re-populates filter dropdowns when a content pack fires `dmtoolbox:packs-ready`. The Bestiary pulls live data from Open5e (which publishes only SRD-licensed content). The Rules and Conditions tabs are hand-authored from the SRD 5.2 CC BY 4.0 text.
