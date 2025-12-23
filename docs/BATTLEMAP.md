# Battle Map Documentation

This document provides detailed information about the DM's Toolbox Battle Map feature evolution and capabilities.

## Overview

The Battle Map is a tactical combat visualization tool with support for fog-of-war, tokens, measurements, and interactive session management. It provides DMs with powerful tools for managing visual combat encounters in D&D 5e and similar tabletop RPGs.

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
- Directional vision arcs
- Adjustable angle and range
- Line-of-sight visualization

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

### Manual Save System (v1.8.0)

**Save Controls:**
- "Save Session" button in Session accordion
- Ctrl+S keyboard shortcut
- Manual saves prevent performance issues

**What Gets Saved:**
- Map state (image, scale, position)
- All tokens with features (labels, HP, conditions, auras, vision)
- Fog-of-war state (covered/revealed areas)
- Fog shapes (rectangles, reveal areas)
- Persistent measurements (lines, cones, circles)
- Grid settings (size, offset, color, alpha)

**Storage:**
- IndexedDB for large data (map images, fog canvas)
- Session persistence across page reloads

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
