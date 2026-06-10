# Initiative Tracker

**Combat management built for clarity and speed**

---

## Quick Start

1. Enter a **Name** (Initiative, Max HP, and AC are optional — blank defaults to 0).
2. Repeat for every combatant, then click **Next Turn**.
3. Use HP **+/−** buttons or the **Amount → Damage/Heal** box to track each hit.
4. Press **N** to advance turns from the keyboard.

---

## Feature Reference

### Turn Order & Rounds

- Combatants **sort by initiative** on add (unless **Lock Order** is on).
- The active combatant is highlighted in green with a pulsing caret. The **next** combatant shows a dimmed caret ("on deck").
- **Next Turn** (`N`) advances the pointer; when it wraps around, the **Combat Round** counter increments.
- Creatures at 0 HP are automatically **skipped** by Next Turn.
- **Drag** the ⋮⋮ handle (desktop) or use the ↑↓ arrow buttons (mobile) to reorder manually.
- **Lock Order** prevents re-sorting when initiative values are edited and disables drag reorder.
- **Reset Rounds** (`R`) resets both the turn pointer and round counter to 1.

### HP & Damage

- **Quick buttons** (−5, −1, +1, +5) for fast adjustments.
- **Precision input**: enter any amount in the Amount box and click the − (damage) or + (heal) icon button. Logs the exact value in the Combat Log.
- **Temp HP (THP)**: badge next to the HP field with its own ±1 buttons. Damage always drains THP before real HP; only the remainder reduces the character.
- Typing directly in the HP field and tabbing away commits the change.
- HP color: red ≤ 25 %, orange 25–50 %, yellow-orange 50–75 %, green > 75 %.
- **Healing above 0 HP** automatically clears death saves and removes Stable.

### Bulk HP Adjustment

Open **Bulk HP** to affect multiple creatures at once — useful for AoE spells, traps, and long rests.

- **Target**: PCs only, Enemies only, or All.
- **Action**: Heal (+X), Damage (−X), or Full Heal (restore to max).
- All changes are logged individually in the Combat Log and collapsed to a **single undo step**.

### Concentration

- Click the ⭐ button on any combatant to toggle concentration on/off.
- While concentration is active, the tracker accumulates all real HP damage dealt to that creature **during the current turn**. At the end of their turn, a prompt appears with the pre-calculated DC (`max(10, ⌊damage / 2⌋)`).
- **Pass** keeps concentration; **Fail** removes it automatically.
- Concentration is also cleared if the creature drops to 0 HP.

### Death Saves

- Shown automatically when a creature's HP reaches 0.
- **+S** adds a success, **+F** adds a failure (capped at 3 each).
- **3 successes** → Stable (saves hidden, "Stable" badge shown).
- **↺** resets both counters.
- Any healing above 0 HP clears death saves and removes Stable.
- Massive-damage instant death is not auto-applied — handle that as DM.

### Status Effects

- Click the 😊 icon to open the status modal for a combatant.
- 14 standard conditions: Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious.
- Each condition supports an optional **duration (rounds)**. Durations tick down automatically at the start of each new round; expired effects are removed automatically.
- Active conditions and concentration appear as emoji chips in the row with a tooltip summary.

### Reactions

- Every combatant row has a **⚡ lightning bolt** button.
- Click it to mark the creature's reaction as **used** (fills yellow). Click again to restore it manually.
- The reaction **automatically resets to available** at the start of that creature's turn.

### Legendary Actions

- Click the dim **👑** crown button on any combatant to enable Legendary Actions.
- You'll be prompted for the maximum (default: 3). A counter badge appears showing `remaining/max`.
- **−** spends one legendary action; **↺** resets remaining to max; **✕** disables legendary actions for that creature.
- The counter **automatically resets to full** at the start of that creature's turn (per 5e rules).

### Notes (per combatant)

- Click the 📓 journal icon to open a notes modal for that creature.
- Store reminders, special abilities, spell names, or anything else. Notes are saved with the session.

### Combat Log

Open **Combat Log** in the controls strip to see a full history of the session, grouped by round.

- Logs every HP change (source, target, before/after/delta), THP change, death save, status event, and concentration check.
- Stores the last **100 events**. Newer events scroll to the top.
- **Export JSON** — machine-readable full log.
- **Export TXT** — formatted table suitable for session records or sharing.
- **Clear Log** wipes the log (does not affect the tracker state).

### Dice Roller

- Quick buttons: d4, d6, d8, d10, d12, d20, d100.
- **Adv** = 2d20 keep highest; **Dis** = 2d20 keep lowest.
- **Custom expression** box supports: `2d6+3`, `4d6kh3` (keep 3 highest), `2d20kl1` (keep lowest), `adv`, `dis`, multi-term expressions.
- Results show in a toast and are saved to the **Roll History** panel (collapsible).

### Saved Character Templates

- Save up to **200** frequently used characters with name, HP, AC, and type.
- Names are unique — saving an existing name updates it.
- **Search** by name, **Filter** by type.
- **Load to Form** fills the add-combatant form; **Add to Tracker** adds them instantly.
- **Clear All** wipes templates only, without touching the active encounter.

### Saving & Session Management

| Feature | What it does |
|---|---|
| **Auto-Save** | Writes to localStorage on every change |
| **Manual Save** (`S`) | Creates a timestamped snapshot |
| **Load Previous Save** | Restores any timestamped snapshot |
| **Export Session** | Downloads the full encounter as JSON |
| **Import Session** | Restores from a previously exported JSON |
| **Undo** (up to 50 steps) | Rolls back the last HP/status/reorder/etc. change |
| **Clear Saved Data** | Wipes all Initiative Tracker data from localStorage |
| **Cross-tab sync** | Changes in one tab/window auto-sync to others |

Undo history is **in-memory only** — it does not survive a page reload.

### Session Notes

- The **Session Notes** panel (right column on desktop) stores general notes for the whole session.
- Auto-saves locally as you type.
- **Export**: TXT, Markdown, or JSON. **Import** restores from a file.
- Clearing Saved Data also clears session notes — export first if you need a backup.

### Player View

- Toggle **Player View** to hide DM-only chrome: AC, HP numbers, dice roller, actions column, save/import controls.
- HP bars remain visible (color-coded) but the numbers go transparent.
- Ideal for a **second monitor or TV** — open the page in a second window, enable Player View there, and leave it off on your DM screen. Both windows stay in sync automatically via cross-tab storage events.

### Rules & Spells Reference

- Click **Rules / Spells Reference** to open a modal with SRD-safe combat references.
- **Rules** tab: searchable entries grouped by category (Combat, Actions, Conditions, Movement, and more).
- **Spells** tab: filter 437 spells by name, class, level, school, and concentration.

### Integration with Other Tools

| Source | How it works |
|---|---|
| **Encounter Builder** | "Send to Initiative Tracker" appends (or replaces) the encounter |
| **Battle Map** | "Sync to Initiative" sends tokens directly; initiative can use the stored bonus or a fresh d20 roll |
| **Character Manager** | Exported characters carry over HP, AC, and type |

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `N` | Next Turn |
| `R` | Reset Rounds |
| `C` | Copy Turn Order |
| `S` | Manual Save |
| `L` | Lock Order toggle |

Shortcuts are disabled while typing in inputs or textareas.

---

## SRD Scope

Built-in rules and spell summaries load only SRD 5.2 (2024 PHB) content through `window.SRDContentFilter`. Encounter data sent from other tools passes through the same allowlist. The Diagnostics panel (Ctrl+Alt+D or footer gear icon) shows whether SRD-only mode is active.
