// ---------- Presets ----------
// PRESETS use the $ shorthand (defined in loot-ui.js) — resolved at call time
const PRESETS = {
  custom: ()=>{},
  t1: ()=>{
    $("lg-mode-count").checked=true;
    $("lg-min").value=1; $("lg-max").value=30;
    $("lg-budget").value=120; $("lg-use").value=45; $("lg-count").value=30;
  },
  t2: ()=>{
    $("lg-mode-budget").checked=true;
    $("lg-min").value=5; $("lg-max").value=120;
    $("lg-budget").value=450; $("lg-use").value=60; $("lg-count").value=40;
  },
  t3: ()=>{
    $("lg-mode-budget").checked=true;
    $("lg-min").value=10; $("lg-max").value=300;
    $("lg-budget").value=1200; $("lg-use").value=70; $("lg-count").value=50;
  },
  t4: ()=>{
    $("lg-mode-budget").checked=true;
    $("lg-min").value=20; $("lg-max").value=600;
    $("lg-budget").value=3000; $("lg-use").value=75; $("lg-count").value=60;
  }
};

// ---------- Quick Bundle configurations ----------
const QUICK_BUNDLES = {
  pocket: {
    name: "Pocket Loot",
    mode: "count",
    lootType: "individual",
    count: 5,
    min: 1,
    max: 15,
    budget: 50,
    usefulness: 50,
    template: "none",
    monster: "none",
    magic: false,
    categories: ["Coins & Purses", "Food & Provisions", "Tools & Utensils", "Mundane Adventuring Items"]
  },
  coinpouch: {
    name: "Coin Pouch",
    mode: "budget",
    lootType: "individual",
    count: 3,
    min: 50,
    max: 200,
    budget: 350,
    usefulness: 10,
    template: "none",
    monster: "none",
    magic: false,
    categories: ["Coins & Purses"]
  },
  gems: {
    name: "5 Gems",
    mode: "count",
    lootType: "hoard",
    count: 5,
    min: 50,
    max: 200,
    budget: 500,
    usefulness: 80,
    template: "none",
    monster: "none",
    magic: false,
    categories: ["Gems & Art"]
  },
  potions: {
    name: "Potion Bundle (3)",
    mode: "count",
    lootType: "hoard",
    count: 3,
    min: 30,
    max: 400,
    budget: 300,
    usefulness: 100,
    template: "none",
    monster: "none",
    magic: true,
    categories: ["Potions & Elixirs"],
    overrideCategories: ["Potions & Elixirs"],
    allowImplicitMinorMagic: false
  },
  scrolls: {
    name: "Scroll Bundle (3)",
    mode: "count",
    lootType: "hoard",
    count: 3,
    min: 40,
    max: 600,
    budget: 450,
    usefulness: 100,
    template: "none",
    monster: "none",
    magic: true,
    categories: ["Arcane Scrolls"],
    overrideCategories: ["Arcane Scrolls"],
    allowImplicitMinorMagic: false
  },
  boss: {
    name: "Boss Hoard",
    mode: "budget",
    lootType: "hoard",
    count: 50,
    min: 10,
    max: 300,
    budget: 2000,
    usefulness: 75,
    template: "none",
    monster: "none",
    magic: true,
    categories: ["Coins & Purses", "Gems & Art", "Trade Goods", "Adventuring Gear of Note"]
  },
  magicitems: {
    name: "Magic Items",
    mode: "count",
    lootType: "hoard",
    count: 8,
    min: 30,
    max: 200,
    budget: 800,
    usefulness: 90,
    template: "none",
    monster: "none",
    magic: true,
    cursed: false,
    curseSeverity: 3,
    categories: ["Adventuring Gear of Note"],
    overrideCategories: ["Minor Magic"],
    allowImplicitMinorMagic: true,
    allowImplicitCursed: false
  },
  curseditems: {
    name: "Cursed Items",
    mode: "count",
    lootType: "hoard",
    count: 6,
    min: 40,
    max: 250,
    budget: 900,
    usefulness: 80,
    template: "none",
    monster: "none",
    magic: false,
    cursed: true,
    curseSeverity: 3,
    categories: ["Adventuring Gear of Note", "Toolkits & Supplies", "Clothing & Wearables", "Gems & Art", "Bags & Containers"],
    overrideCategories: ["Cursed Items"],
    allowImplicitMinorMagic: false,
    allowImplicitCursed: true
  }
};
