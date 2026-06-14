# Journal Documentation

**Rich text editor with persistent storage for campaign notes, session logs, and world-building**

## SRD Content Scope

The bundled journal ships with no prewritten adventures or lore. All default formatting presets, example titles, and export templates reference only material that is explicitly part of the 5e Systems Reference Document (SRD) or is user-authored during editing. If you maintain private compendiums (e.g., paid books or homebrew), load them locally through import/export flows and keep them out of the public repo to preserve SRD-only distribution. Any screenshots or documentation snippets should likewise avoid quoting non-SRD text verbatim.

---

## Editor

The journal uses **TipTap 2** (ProseMirror-based) for rich text editing. Content is stored as HTML in IndexedDB and loads instantly on return visits.

### Text Formatting
- **Heading styles** — Normal, Heading 1, Heading 2, Heading 3 (dropdown selector)
- **Inline marks** — Bold, Italic, Underline, Strikethrough
- **Text color** — full color picker, applies to selected text
- **Highlight color** — background color picker for text highlighting
- **Text alignment** — Left, Center, Right
- **Clear Formatting** — strips all marks and block types from selection

### Lists & Blocks
- **Bullet list** — unordered list
- **Numbered list** — ordered list
- **Task list / Checklist** — interactive checkboxes; checked items get strikethrough styling; supports nested task lists
- **Blockquote** — left-border callout block, styled with italic text; great for NPC speech or flavor text
- **Code block** — monospace preformatted block
- **Horizontal rule** — visual section divider
- **Collapsible section** — `<details>/<summary>` block insertable via the toolbar button or `/collapse`. The title text is automatically selected on insert — start typing immediately to rename it. Click the ▶ arrow to expand/collapse; toggle state persists through saves and editor re-renders. Press Enter on an empty line inside to exit the section and continue writing below it. Ideal for hiding DM-only notes while players see the screen.

### Slash Commands
Type `/` anywhere in the editor to open a command palette. Browse with Arrow keys, filter by typing, confirm with Enter or click, dismiss with Escape.

Available commands: Heading 1/2/3, Bullet List, Numbered List, Task List, Table, Collapsible Section, Blockquote, Code Block, Divider, Image.

### Typography Auto-Corrections
The editor automatically replaces common patterns as you type:
- `"text"` → curly quotes
- `--` → en dash, `---` → em dash
- `...` → ellipsis `…`
- `(c)`, `(r)`, `(tm)` → ©, ®, ™

### [[Wikilinks]]
Type `[[` inside the editor to open a fuzzy-search dropdown of all your journal entries. Select one to insert a clickable link styled `[[Entry Name]]`. Clicking a wikilink in the editor navigates directly to that entry. Wikilinks are stored in the HTML and enable the backlinks feature.

### Backlinks Panel
When an entry is open that has been referenced by other entries (via `[[wikilinks]]`), a **Referenced by** panel appears below the editor showing all entries that link to the current one. Click any entry name in the panel to navigate to it.

### Tables
- **Insert Table** — toolbar dropdown with preset sizes (2×2, 3×3, 4×4, 5×5, 3×5); first row is automatically a header row
- **Table Context Bar** — appears automatically when the cursor is inside a table:
  - Add row above / below
  - Add column left / right
  - Delete row / column
  - Merge selected cells / split cell
  - Toggle header row
  - Delete entire table
- Column widths can be resized by dragging the column border

### Links
- Select text then click the link button to wrap it in a hyperlink
- Click the link button with no selection to insert a new link (prompts for URL and display text)
- Click the link button when cursor is on an existing link to edit or remove it
- All links open in a new tab

### Images
- **Insert** — toolbar image button opens a file picker; images are stored as base64 data URLs (no external hosting required)
- **Resize** — click an image to show 8 resize handles (corners + edges); drag any handle to resize; aspect ratio is maintained on corner drags
- **Float alignment** — clicking an image shows an alignment toolbar: **Left** (text wraps right), **None** (block), **Right** (text wraps left)
- Alignment and size are preserved across saves and reloads

---

## File Management

### Sidebar
- Lists all saved entries with title, creation date, and last-edited date
- **Content preview** — first ~100 characters of each entry shown beneath the title
- **Entry count badge** — shows total entries (or filtered count when searching)
- Active entry is highlighted with a green left border
- Last opened entry is automatically restored when you return to the page

### Sorting
Six sort options in the sidebar dropdown:
- Last Modified (Newest) — default
- Last Modified (Oldest)
- Created (Newest)
- Created (Oldest)
- Name (A–Z)
- Name (Z–A)

### Search
- Searches both entry **names** and **content** (strips HTML before matching)
- Results show a snippet of matching text with the search term highlighted in yellow
- Entry count badge updates to show filtered vs. total count

---

## Import

Click the yellow **upload** button in the sidebar header.

| Format | Support |
|--------|---------|
| `.txt` | Full — converted to paragraphs |
| `.md` / `.markdown` | Full — headers, bold, italic, links, code blocks, lists parsed to HTML |
| `.docx` | Not yet supported |
| `.pdf` | Not yet supported |

Imported entries are named from the filename (extension removed) and immediately opened in the editor.

---

## Export

### Single Entry
Click the green **Export** button to open the format picker:

| Format | Notes |
|--------|-------|
| Plain Text (.txt) | Strips formatting; adds title underline |
| Markdown (.md) | Converts HTML to Markdown syntax; preserves headers, bold, italic, links, images, lists |
| Word (.docx) | Formatted document with heading hierarchy |
| PDF | Title + body text; auto-pagination |
| Copy to Clipboard | Plain text copied to clipboard |

All file exports append the SRD license attribution page.

### Bulk Export
Click the blue **download** button in the sidebar header:
- Search and filter entries by keyword
- Check individual entries or use Select All / Deselect All
- Selection counter updates live
- Choose TXT, Markdown, Word, or PDF
- On export, choose **single combined file** (all entries in one document) or **separate files** (one per entry)
- Downloads are staggered 300ms apart to prevent browser blocking

### Print
Click the **printer** button next to Export. A print stylesheet hides the sidebar, toolbar, and navigation — only the entry content is printed.

---

## Saving

- **Manual save** — Save button or `Ctrl+S` / `Cmd+S`
- **Save indicator** — the Save button turns yellow and shows an asterisk (`Save *`) when there are unsaved changes
- **Auto-restore** — last-opened entry is remembered in localStorage and reopened automatically on next visit
- **Unsaved-change guard** — switching entries or creating a new entry prompts for confirmation if there are unsaved changes

---

## Persistent Storage

All data is stored in **IndexedDB** (`JournalDB`) in the user's browser. No accounts, no cloud sync, no data leaves the device. Entries persist indefinitely across sessions.

Indexed fields: `timestamp` (creation), `lastModified`, `name`.

---

### Block Drag Handles
Hover over any top-level block in the editor (paragraph, heading, list, table, etc.) to reveal a ⠿ grip icon to the left. Drag the grip to reorder that block anywhere in the entry. A green drop indicator shows exactly where the block will land. Press Ctrl+Z to undo.

---

### Help Offcanvas
Click the **?** button in the entry header (between Focus Mode and Delete) to open a slide-in help panel. It contains 11 accordion sections covering every live journal feature: Getting Started, Slash Commands, Text Formatting, Lists/Blocks/Tables, Links & Images, Wikilinks & Backlinks, Drag to Reorder, Tags/Search/Sorting, Saving & Storage, Export/Print/Focus Mode, and a Keyboard Shortcuts cheat sheet. The panel slides over the editor without interrupting unsaved work and can be scrolled independently.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save current entry |
| `Ctrl+B` / `Cmd+B` | Bold |
| `Ctrl+I` / `Cmd+I` | Italic |
| `Ctrl+U` / `Cmd+U` | Underline |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Y` / `Cmd+Y` | Redo |
| `/` | Open slash command palette |
| `[[` | Open wikilink entry picker |
| `Escape` | Close slash/wikilink popup; exit focus mode |
| `Tab` (in table) | Move to next cell |
| `Shift+Tab` (in table) | Move to previous cell |
| `Enter` (empty line inside collapsible) | Exit collapsible section; insert paragraph below |

---

## Use Cases

- **Session logs** — write up what happened each session; use H2 for major events, task lists for loose ends
- **NPC profiles** — heading for name, blockquote for their voice/speech pattern, image for portrait
- **Locations** — heading, description paragraphs, table for notable features vs. connections
- **Encounter notes** — table for monsters (name, HP, AC, notes), task list for DM reminders
- **World-building** — long-form lore with embedded maps; float images left or right for book-like layouts
- **Prep checklists** — task lists for things to prep before next session; check them off as you go
- **Campaign index** — one entry per topic, search across all of them by keyword

All data stays in your browser with no accounts or cloud sync required.
