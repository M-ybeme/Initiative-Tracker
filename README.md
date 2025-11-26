# The DM’s Toolbox

A lightweight suite of browser-based tools for tabletop RPG Game Masters. Built entirely with **HTML, CSS, and JavaScript**, deployed through Netlify, and designed with a fast, practical, table-ready workflow in mind. All data is stored locally using **LocalStorage**, keeping the tools quick, private, and fully offline-capable.

This is a personal hobby project created for fun and utility—no monetization, no tracking, no analytics. A Ko‑fi link is available on the site for anyone who wants to support the project, but all features are completely free.

Live Site: **[https://dnddmtoolbox.netlify.app/](https://dnddmtoolbox.netlify.app/)**

---

## ✨ Features

The DM’s Toolbox contains several focused tools intended to help GMs run sessions smoothly without clutter or overhead.

### **📊 Initiative Tracker**

A streamlined combat tracker built for clarity and quick adjustments. Supports HP/AC updates, temporary HP, concentration, death saves, status effects, turn highlighting, encounter import/export, a Player View mode, and persistent saved characters.

### **🗺️ Battle Map (MVP)**

A simple, drag‑and‑drop battle map for tokens with fog‑of‑war and scale controls. Designed to be lightweight and easy to use on both desktop and mobile.

### **⚔️ Encounter Builder**

Quickly assemble encounters and send them directly to the Initiative Tracker.

### **🏪 Shop Generator**

Generates vendor inventories with items, rarity tuning, and optional town presets.

### **🧙 Rules & Spells Reference**

Spell and rule lookups available directly inside the Initiative Tracker.

### **📝 Session Notes**

A clean in‑browser notes tool that saves automatically.

### **🎲 Name Generator**

A practical fantasy name generator with adjustable patterns.

---

## 🚀 Tech Stack

* **HTML5 / CSS3 / JavaScript** (no frameworks)
* **Bootstrap 5** for layout
* **LocalStorage** for all persistence
* **Netlify** for deployment and CI
* **GitHub** for version control and changelog history

---

## 📜 Changelog

Full version history is available in [`CHANGELOG.md`](./CHANGELOG.md).

Recent highlights:

* **1.5.0** — Initiative refactor and Player View improvements
* **1.4.0** — Battle Map MVP and Encounter Builder
* **1.3.0** — Spells and rules integration
* **1.2.0** — Concentration, temp HP undo, and death saves
* **1.1.0** — Generator improvements
* **1.0.0** — Initial Toolbox release

---

## 📁 Project Structure

```
/css
    initiative.css
    site.css

/images
    enemyTokens/
    playerTokens/
    BGMap.png
    dndFavicon.png
    White logo - no background.png

/js
    initiative.js
    rules-data.js
    spells-data.js
    site.js

battlemapp.html
encounterbuilder.html
index.html
loot.html
name.html
new.html
npc.html
shop.html
tav.html
LICENSE.md
CHANGELOG.md
```

---

## 🔒 License

This project is distributed under the **MIT License**.
A version/build signature is embedded in the source for authorship clarity.

---

## 🙌 Support & Contributions

This is a free, non-commercial project maintained for fun.
If you’d like to support the project, a Ko‑fi link is available on the live site.

Suggestions and bug reports are welcome through GitHub Issues.

---

## 🙏 Acknowledgments

Thanks to every GM and player who inspired these tools through real table use.
