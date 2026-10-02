# Battle Map Documentation

This document provides detailed information about the DM's Toolbox Battle Map feature evolution and capabilities.

## Overview

The Battle Map is a tactical combat visualization tool with support for fog-of-war, tokens, measurements, and interactive session management. It provides DMs with powerful tools for managing visual combat encounters in D&D 5e and similar tabletop RPGs.

### SRD Scope

- The battle map itself works with custom art/uploads, but any rules text that surfaces (tooltips, quick adds to Initiative Tracker) runs through `window.SRDContentFilter` so only SRD entities render in the public build.
- When you right-click a token to "Add to Initiative", the downstream import respects the SRD allowlist—non-SRD stat blocks stay hidden unless a private content pack is active in the browser.
- Private packs can register additional monsters/spells locally without changing this documentation; the map simply reflects whatever the runtime allowlist approves.

## Table of Contents

- [Core Features](#core-features)
- [Token System](#token-system)
- [Fog of War](#fog-of-war)
- [Measurement Tools](#measurement-tools)
- [Performance & Architecture](#performance--architecture)
- [Session Management](#session-management)

---

## Core Features

### Battle Map MVP (v1.4.0)

**Initial Release (2025-11-03 to 2025-11-21):**
- Token placement system with drag-and-drop
- Fog-of-war with reveal/cover modes
- Scale controls and map state saving to LocalStorage
- Pinch-zoom and mobile interaction support

---

## Token System

### Token Enhancement Features (v1.8.3)

**Token Labels:**
- Toggle persistent name labels above tokens
- Clear identification during combat

**HP Tracking:**
- Visual HP bars
- Set/damage/heal/clear options
- Real-time HP display

**Status Conditions:**
- Add multiple status effects (Poisoned, Stunned, etc.)
- Status icons displayed above tokens
- Clear visual indicators for combat conditions

**Aura Effects:**
- Customizable radius circles around tokens
- Adjustable color selection
- Visual range indicators

**Vision Cones:**
- Directional vision arcs, pointing the way the token is turned (R rotates the selected token)
- Adjustable angle and range
- An indicator only: it does not calculate line of sight or decide what anyone can see

**Context Menu:**
- Compact 9-item menu
- Intelligent positioning
- Fixed positioning with overflow detection for mobile

**Rendering Optimization:**
- Three-pass rendering system:
  1. Auras (bottom layer)
  2. Tokens (middle layer)
  3. Overlays (top layer - HP bars, labels, conditions)
- Prevents flickering during token updates

**Persistence:**
- All token features save/load with map session
- Labels, HP, conditions, auras, and vision preserved

### Aura Radius Auto-Adjustment (v1.9.0)

**D&D 5e Accurate Auras:**
- Aura circles automatically add 0.5 cells to user-specified radius
- Accounts for token's own cell (aura extends from edge, not center)
- Example: 10 ft aura (2 cells) displays as 2 cells beyond token's space
- User-facing values unchanged - adjustment is visual only

---

## Fog of War

### Fog Shapes Enhancement (v1.8.0)

**Interactive Resize Handles:**
- Rectangles and squares have 8 drag handles (4 corners + 4 edges)
- Corner handles: Diagonal resizing
- Edge handles: Horizontal or vertical resizing
- Minimum size constraints
- Visual handles (8px blue squares) when selected

**Improved Rendering:**
- Shapes render on top of tokens for better visibility
- `drawFogShapes()` function renders filled shapes in world-space
- Cover mode: Shapes display with selected color
- Reveal mode: Semi-transparent overlays
- Fixed visibility issue where shapes only showed outlines

**Fog Shape Modes:**
- **Cover mode**: Actively hide map areas
- **Reveal mode**: Show previously hidden areas

---

## Measurement Tools

### Quick Measurement (v1.4.0)

**Basic Distance Tool:**
- Temporary measurement on mouse drag
- Displays distance in feet
- Disappears on release

### Multi-Shape Measurement Tools (v1.9.0)

**Shape Options:**

1. **Line Measurement** (original)
   - Straight-line distance
   - Label: "X ft (line)"

2. **Cone Measurement** (new)
   - 90-degree cone from origin
   - Points toward cursor
   - Semi-transparent fill (20% opacity)
   - Solid border
   - Label: "X ft cone"

3. **Circle Measurement** (new)
   - Radius/AoE measurement
   - Visual circle fill
   - Semi-transparent (20% opacity)
   - Solid border
   - Label: "X ft radius"

**Interaction:**
- Shape selector dropdown
- Shapes persist while mouse button held
- Disappear on release
- Right-click to exit measurement mode

### Persistent Measurement System (v1.10.6)

**Creating Measurements:**
- "Persist Measure" button for permanent measurements
- Three shapes: Line, Cone (90°), Circle
- Color picker for custom colors
- Live preview while dragging
- Shows shape and distance before releasing

**Interactive Editing:**

1. **Move Measurements**
   - Click and drag anywhere in measured area
   - Repositions entire measurement

2. **Resize Measurements**
   - Drag endpoint handles
   - Adjust size and direction dynamically

3. **Rename Measurements**
   - Right-click → "Rename"
   - Custom labels for organization
   - Smart positioning above shapes

4. **Delete Measurements**
   - Right-click → "Delete" for individual removal
   - "Clear Measures" button removes all

**Persistence:**
- All measurements save with session
- Load with map on session restore
- IndexedDB storage integration

**Context Menu:**
- Right-click on measurements
- Rename and Delete options
- Prevents default browser context menu

---

## Performance & Architecture

### Layered Canvas Architecture (v1.10.6)

**Performance Revolution:**
- Eliminated flickering with event-driven rendering
- No more 60fps continuous redraw
- Dramatically improved CPU efficiency
- More features now possible on toolset

**Four Canvas Layers:**

1. **mapLayer** - Base map image
2. **fogLayer** - Fog-of-war overlay
3. **tokenLayer** - Tokens and game pieces
4. **uiLayer** - Interactive UI elements

**Rendering System:**

**Dirty Flag System:**
- Selective redraws only when needed
- Triggers on actual changes, not continuous
- Layer-specific dirty flags

**Render Functions:**
- `renderMapLayer()` - Base map rendering
- `renderFogLayer()` - Fog-of-war rendering
- `renderTokenLayer()` - Token rendering
- `renderUiLayer()` - UI overlay rendering

**Pan/Zoom Operations:**
- Synchronous updates across all layers
- Map, fog, tokens, and UI transform together
- Smooth navigation without desync

**Canvas Configuration:**
- All canvases use `pointer-events:none` except uiLayer
- Ensures consistent interaction
- HTML structure with 4 stacked canvas elements

**Technical Implementation:**
- requestAnimationFrame-based render queue
- Dirty flag tracking per layer
- Debounced resize handling
- Prevents redundant renders

### Hit Detection Algorithms (v1.10.6)

**Measurement Interaction:**
- `pointToLineDistance()` - Line measurement clicks
- Cone angle checks - Cone measurement hits
- Circle radius tests - Circle measurement hits

**Drag Modes:**
- `measurementResize` - Endpoint dragging
- `measurementDrag` - Full shape dragging

---

## Session Management

### Manual Save System (v1.8.0; Save button, drafts and Live Share publishing v2.3.27)

**Save Controls:**
- **Save** button next to the Fog / Measure tabs (v2.3.27)
- "Save Session" button in Session accordion
- Ctrl+S keyboard shortcut
- All three run the same save; saves never overlap (one asked for during another runs right after it)
- Manual saves prevent performance issues

**Save button states (v2.3.27):** the button is also the unsaved-changes indicator
- **Clean** (subdued): everything is saved
- **Unsaved** (highlighted, pulsing): there are changes since the last save. Every edit counts: token moves, adds, deletes, labels, conditions, fog painting, fog shapes, grid, measurements, Visible to Players
- **Saving…** while writing, then **Saved** briefly
- A save that fails (for example, storage full) keeps the map unsaved and tells you; nothing is lost from the page
- A save asked for while a map is still loading (right after a reload, an Import or loading a map image) waits until its image and fog have loaded, so the map is never stored without them
- The older "Unsaved Changes" badge in the Session section follows the same state

**Saved map vs draft (v2.3.27):**
- The **saved map** is what you last saved explicitly. It is what a reload publishes to Live Share players.
- A **draft** is stored automatically by actions that have always stored the map straight away: placing a token, loading a map, fog on/off, clearing fog, adding a fog shape, importing, tokens sent from the Character Manager. It keeps your work, but it is still unsaved, and it never replaces the saved map.
- After a reload, a draft is restored as your working map, still marked unsaved; Save makes it the saved map. A draft left over from before a later save is ignored.
- Maps stored by versions before 2.3.27 load as saved maps.

**What Gets Saved:**
- Map state (image, scale, position)
- All tokens with features (labels, HP, conditions, auras, vision)
- Fog-of-war state (covered/revealed areas)
- Fog shapes (rectangles, reveal areas)
- Persistent measurements (lines, cones, circles)
- Grid settings (size, offset, color, alpha)

**Storage:**
- IndexedDB for large data (map images, fog canvas), with a localStorage copy
- Two records: the saved map (`current-session`, localStorage `dmtoolbox.battlemap.mvp.v3`) and the draft (`current-draft`, localStorage `dmtoolbox.battlemap.mvp.v3.draft`)
- Session persistence across page reloads

**Visible to Players (v2.3.27):**
- A token's right-click menu has **Visible to Players** (checked by default). A hidden token stays on your map, dimmed with a crossed-eye badge, and is left out of everything Live Share sends, its art, aura and vision cone included
- The setting is saved with the map and kept by **Export JSON / Import** (exports always include it; files exported before 2.3.27 have none, and their tokens are visible)

**Live Share publishes only the saved map (v2.3.27, `battlemap.html?liveshare=1`):**
- Players see the Battle Map as last saved, never your working state. Edits stay private until you save; one save publishes them together (tokens, fog and background in step). The Save button's tooltip says "Save changes and update players" while a room is open
- A failed save publishes nothing: players keep the last saved map
- A player who joins while you have unsaved changes gets the last saved map
- A map that was never saved can't be shared until it is saved
- After a reload, players get the saved map even if a draft is restored for you. While the saved map is still loading, or if its image can't be read, **Start room** says so and opens nothing
- The images of the published map stay available to joining players until a newer save has been published

**Auras and vision cones for Live Share players (v2.3.29):**
- Players see the aura and vision cone of every token they can see, drawn like yours: the aura as a circle of its radius plus half a cell around the token, the cone from the token's centre along its rotation, both in their colors and under the tokens
- They follow Save like everything else: a changed aura, vision cone, rotation or grid size reaches players when you save
- They are sent as a few numbers and a `#rrggbb` color per token, never as part of the map image, so changing them does not resend the map background
- A token hidden with Visible to Players sends no aura or vision cone either
- The vision cone is a visual indicator for players too: it does not hide or reveal anything and has nothing to do with the fog

**What else players see (v2.3.30):**
- Tokens with a built-in Player or Enemy image show that image; Live Share names it by a short id, never by its address. Uploaded and Character Manager art is sent as before. Other images show as a colored marker
- The grid in your saved color, opacity, cell size and offset (or none, if Show Grid is off). It is drawn on top of the player's map image, so unlike yours it also shows over fogged areas
- Players can pan and zoom their own view (drag, mouse wheel, pinch; Fit resets it). It never changes your map or view

**Auto-Save Removal:**
- Eliminated from grid adjustments (size, offset, color, alpha)
- Removed from token/shape dragging
- Removed from continuous fog painting
- Retained for major discrete operations (loading maps, importing)

**Performance Benefits:**
- No slowdown during continuous operations
- Smooth dragging and painting
- Manual control over when saves occur

---

## Help Documentation

### Enhanced Help System (v1.10.6)

**Measurement Section:**
- Quick Measure vs Persistent Measurements
- Step-by-step editing instructions
- Moving, resizing, renaming, deleting
- Clear explanations of shape types
- Use case examples

**Updated Documentation:**
- Fog shapes detailed documentation (v1.8.0)
- Saving & Loading section (v1.8.0)
- Token features and context menu usage (v1.8.3)

---

## Version History Summary

1. **v1.4.0** - Battle Map MVP with tokens, fog-of-war, and basic controls
2. **v1.8.0** - Fog shapes enhancement with resize handles and manual save
3. **v1.8.3** - Token features (labels, HP, conditions, auras, vision)
4. **v1.9.0** - Multi-shape measurements (line, cone, circle) and aura fixes
5. **v1.10.6** - Performance optimization with layered canvas and persistent measurements
6. **v2.1.7** - UX overhaul: mode tabs toolbar, Bootstrap modals, fog brush cursor, sidebar stabilization, slimmed controls
7. **v2.3.27** - Save button, private drafts, Visible to Players, and Live Share publishing only saved maps
8. **v2.3.29** - Live Share players see saved auras and vision cones
9. **v2.3.30** - Live Share players see built-in token images and can pan and zoom the map themselves

---

## UX Overhaul (v2.1.7)

### Mode Tabs Toolbar

The flat scrollable control bar has been replaced with a two-tab panel:

- **🌫 Fog tab** (default) — All fog-of-war controls: enable/disable, Reveal/Cover mode, brush size, Brush Mode toggle, Clear Fog, and fog shape controls (type, color, size, Add/Delete).
- **📐 Measure tab** — All measurement controls: Measure toggle, shape selector (Line/Cone/Circle), Persistent toggle, color picker, and Clear Measures.

Clicking a tab shows its panel and hides the other, keeping the toolbar compact at all times.

### Fog Brush Cursor

While in brush mode (Shift+Drag on desktop or Brush Mode button), a dashed circle follows the cursor showing the exact paint radius:
- Blue tint in Reveal mode
- White in Cover mode

Brush strokes also render immediately without needing to pan the map first.

### Bootstrap Modals for Token Editing

All token right-click context menu actions that previously used native `prompt()` dialogs now open Bootstrap modals:
- **Set HP** — Current/max HP with damage and heal buttons
- **Add Status** — Dropdown of all 2024 PHB conditions
- **Set Aura** — Radius (cells) and color picker
- **Set Vision** — Angle and range inputs
- **Add to Initiative** — Name, AC, HP, and initiative fields

Modals work correctly on mobile and do not lose canvas focus. Keyboard hotkeys (Delete, R, +, −) are guarded so they do not fire while typing inside modal inputs.

### Sidebar Stabilization

- Sidebar holds a fixed **300 px width** regardless of which accordions are open or closed.
- Sidebar stretches to **full viewport height** at all times.
- A floating **collapse toggle button** at the top-left of the canvas opens/closes the sidebar on desktop; canvases resize after the animation.

### Slimmed Controls (Sections 1 & 2)

Label text shortened and number inputs given explicit compact widths to eliminate horizontal overflow:
- "Base Scale (px per cell)" → "Cell size (px)"
- "Map Offset X/Y (px)" → "Offset X / Offset Y"
- "Grid Origin X/Y (px)" → "Origin X / Origin Y"
- "Reset Map Transform" → "Reset Transform"
- "Align to Clicked Intersection" → "Align to Grid"
- File inputs (Upload Map, Upload Image) stack vertically to prevent the browser file button from overlapping the label text.

---

## Technical Details

### File Structure
- **[battlemap.html](../battlemap.html)** - Main battle map interface
- Fog-of-war canvas rendering
- Token management system
- Measurement tools integration

### Canvas Rendering
- Multiple canvas layers for optimal performance
- Event-driven rendering with dirty flags
- requestAnimationFrame for smooth updates

### Storage System
- IndexedDB for large binary data
- LocalStorage backup for small data
- Automatic migration on first load

### Interaction Modes
- Pan/zoom navigation
- Token drag-and-drop
- Fog painting (brush/shape)
- Measurement creation and editing
- Context menu operations

## Use Case

Upload a dungeon map, calibrate the grid in two clicks, add tokens. Enable "Persistent" mode and create a red circle measurement for "Fireball AoE" (drag to 4 cells = 20 ft, auto-adjusts to 4.5 cells for token size). Add blue circle for "Spirit Guardians" (3 cells = 15 ft). Click measurements to see exact distances, drag to reposition, resize by handles. Measurements stay visible during pan/zoom without flicker. Reveal rooms as players explore using fog shapes. Right-click enemies to add to Initiative Tracker when combat starts. Works on desktop or tablet at the table.
