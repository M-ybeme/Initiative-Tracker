# Initiative Tracker Documentation

**Combat management built for clarity and speed**

## Features

- **HP/AC tracking** with damage history and unlimited undo
- **Temporary HP** with priority damage consumption and undo support
- **Concentration tracking** with automatic DC calculation (max(10, damage÷2))
- **Death saves automation** - Nat 20 = regain 1 HP, Nat 1 = 2 failures
- **Bulk HP adjustment** - Heal/damage multiple characters at once (AoE spells, long rests)
- **Status effects** and condition tracking with visual indicators
- **Turn highlighting** with round counter and automatic progression
- **Player View mode** - TV/tablet display with hidden AC, notes, and secrets
- **Editable names** with smart duplicate numbering (Goblin, Goblin 2, etc.)
- **Drag-to-reorder** initiative with persistent turn tracking
- **Import/export** encounters as JSON
- **Saved characters** with unique IDs for instant reuse
- **Rules & Spells reference** integrated into interface
- **One-click integration** with Encounter Builder, Character Manager, and Battle Map

### SRD Scope

- The built-in rules/snippet reference loads only SRD 5.2 (2024 PHB) mechanics through `window.SRDContentFilter`.
- Any encounter data sent from other tools passes through the same allowlist so stat blocks and spell cards never display non-SRD text unless a private content pack is loaded locally.
- Diagnostics panel (Ctrl+Alt+D or footer gear icon) shows the active SRD filter so DMs can confirm whether the tracker is running in SRD-only mode.

## Use Case

Run combat without juggling notebooks. Track 6 PCs + 12 enemies with damage history, death saves, and concentration—all visible at a glance. Display Player View on TV for transparency.
