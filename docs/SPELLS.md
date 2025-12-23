# Spell Database Documentation

This document provides detailed information about the DM's Toolbox spell database implementation.

## Overview

The DM's Toolbox includes a comprehensive D&D 5e spell database with **432 spells** from the Player's Handbook, Xanathar's Guide to Everything, and Tasha's Cauldron of Everything.

## Version History

### 1.8.1 - Complete D&D 5e Spell Database Expansion (2025-12-05)

**Major Expansion**: Added 120+ missing spells, increasing total from 312 to 432 spells (~138% increase).

#### Added Spell Collections

**Xanathar's Cantrips (17 spells)**
- Booming Blade, Green-Flame Blade, Toll the Dead, Mind Sliver
- Control Flames, Shape Water, Mold Earth, Gust
- Create Bonfire, Frostbite, Infestation, Lightning Lure
- Magic Stone, Primal Savagery, Sword Burst, Thunderclap, Word of Radiance

**Paladin Smite Spells (6/6 complete)**
- Searing Smite, Thunderous Smite, Wrathful Smite
- Branding Smite, Staggering Smite, Banishing Smite

**Tasha's Summon Spells (10/10 complete)**
- Summon Beast, Summon Fey, Summon Elemental, Summon Construct
- Summon Celestial, Summon Aberration, Summon Fiend
- Summon Shadowspawn, Summon Undead, Summon Draconic Spirit

**Essential Warlock Spells (22 spells)**
- Hex, Armor of Agathys, Arms of Hadar, Hunger of Hadar
- Witch Bolt, Cause Fear, Crown of Madness, Shadow Blade
- Enemies Abound, Synaptic Static, Soul Cage, Blade of Disaster
- Plus additional patron-specific options

**Critical Ranger Combat Spells (12 spells)**
- Zephyr Strike, Hail of Thorns, Lightning Arrow
- Steel Wind Strike, Swift Quiver, Healing Spirit
- Conjure Woodland Beings, Guardian of Nature
- Plus additional nature and combat spells

**Artificer Utility Spells (15 spells)**
- Identify, Absorb Elements, Catapult, Snare
- Tasha's Caustic Brew, Thorn Whip
- Plus additional crafting and utility spells

**Popular Xanathar's Spells (28 spells)**
- Shadow Blade, Dragon's Breath, Ice Knife, Life Transference
- Mind Spike, Melf's Minute Meteors, Erupting Earth
- Tidal Wave, Storm Sphere, Watery Sphere, Whirlwind
- Investiture of Flame, Investiture of Ice, Investiture of Stone, Investiture of Wind
- Vitriolic Sphere, Warding Wind, Temple of the Gods
- Bones of the Earth, Primordial Ward, Mighty Fortress
- Abi-Dalzim's Horrid Wilting

**Tasha's Signature Spells (10 spells)**
- Spirit Shroud, Tasha's Caustic Brew, Tasha's Mind Whip
- Tasha's Otherworldly Guise, Intellect Fortress
- Summon Draconic Spirit, Blade of Disaster
- Dream of the Blue Veil

**Universal Utility Spells**
- Invisibility, Identify, Absorb Elements, Snilloc's Snowball Swarm

## Database Statistics

### By Source Book
- **Player's Handbook (PHB)**: 100% complete
- **Xanathar's Guide to Everything**: ~90% complete (45+ spells added)
- **Tasha's Cauldron of Everything**: ~85% complete (18+ spells added)

### By Spell Level
- **Cantrips (0)**: 41 spells
- **1st Level**: 60+ spells
- **2nd Level**: 65+ spells
- **3rd Level**: 57+ spells
- **4th Level**: 42+ spells
- **5th Level**: 45+ spells
- **6th Level**: 38+ spells
- **7th Level**: 25+ spells
- **8th Level**: 19+ spells
- **9th Level**: 16+ spells

### By Class (Primary Coverage)
- **Wizard**: 240+ spells
- **Sorcerer**: 145+ spells
- **Bard**: 120+ spells
- **Cleric**: 118+ spells
- **Druid**: 115+ spells
- **Warlock**: 84+ spells (up from 62)
- **Paladin**: 49+ spells (up from 37)
- **Ranger**: 50+ spells (up from 38)
- **Artificer**: 42+ spells (up from 27)

## Complete Class Spell Coverage

### Paladin
- 100% Smite spell coverage (all 6 variants)
- Complete oath spell collection

### Ranger
- Complete combat spell arsenal
- Full nature spell collection

### Warlock
- Full signature spell list
- Patron-specific options included

### Artificer
- Complete utility spell collection
- All crafting-related spells

### Druid / Wizard / Sorcerer / Cleric
- Enhanced with Xanathar's elemental and utility spells
- Modern damage types and mechanics (psychic, force, etc.)

## Modern D&D Content

The spell database includes popular post-PHB content:
- All Tasha's Cauldron of Everything summon spells (most popular summoning system)
- Xanathar's Guide elemental cantrips and melee weapon cantrips
- Modern damage types and mechanics

## Implementation Details

- All spells maintain consistent formatting with proper tags
- Concentration flags properly set
- Class lists accurately maintained
- Database completeness improved from ~70% to ~95% for PHB/Xanathar's/Tasha's content

## Integration with Character Manager

The spell database integrates seamlessly with the Character Manager system:
- Spell slot tracking for all 9 levels plus Pact Magic
- Spellcasting ability tracking (INT/WIS/CHA)
- Spell list organization by level
- Complete spell details including:
  - Name and school of magic
  - Casting time, range, components (V/S/M)
  - Duration and concentration requirements
  - Ritual and prepared status
  - Full spell description text

See [CHARACTER_MANAGER.md](CHARACTER_MANAGER.md) for details on character sheet spell system integration.
