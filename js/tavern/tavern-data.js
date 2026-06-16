// ---------- Data Pools ----------
const SETTLEMENT = {
  village:{ price:[1.05,1.20], room:[1.0, 3], meals:6, drinks:7, staff:3 },
  town:{    price:[0.95,1.10], room:[1.0, 6], meals:8, drinks:9, staff:4 },
  capital:{ price:[0.90,1.05], room:[1.0,10], meals:10,drinks:12,staff:5 }
};
const QUALITY = {
  rough:{ mult:0.9, tags:["rough-hewn benches","sawdust underfoot","smoky rafters","loud by night"] },
  common:{ mult:1.0, tags:["well-swept floor","sturdy tables","busy at supper","lamplit"] },
  cozy:{ mult:1.2, tags:["crackling hearth","soft chairs","warm lighting","fresh bread scent"] },
  fine:{ mult:1.5, tags:["polished wood","quiet service","fine glassware","linen tablecloths"] }
};

const AMBIENCE = ["low murmur","fire-lit","lamplit","clean","cozy","drafty","lively","quiet","rowdy after dusk","musician on market nights","card games","dice at back table","chalk menu board","cat by the hearth","fresh sawdust","hops aroma","yeast and bread","woodsmoke","herbal tea scents","oiled hinges"];

const AMBIENCE_BY_TYPE = {
  dwarven: ["forge-warmed","stone pillars","ale-soaked tables","carved clan symbols","hammer-and-anvil decor","barrel-vaulted ceiling","mountain stone walls","brass tankards clanging"],
  elven: ["moonlight filtering through","silver-threaded curtains","living wood furniture","soft harp melodies","ethereal glow","flowering vines overhead","crystal chimes tinkling","ancient tree supports"],
  halfling: ["hearth-fire crackling","pie-scented air","cozy cushioned chairs","family portraits on walls","pipe smoke drifting","comfortable quilts draped","warm bread constantly baking","children's laughter echoing"],
  orcish: ["battle trophies mounted","skull decorations","thick smoke","war drums in corner","weapon racks on walls","bone chandeliers","trophy pelts hanging","combat circle cleared"],
  coastal: ["salt air drifting","driftwood furniture","fishing nets hanging","porthole windows","ship bell at bar","nautical flags displayed","rope and anchor decor","tide charts posted"],
  desert: ["silk drapes flowing","spice-scented air","cushioned floor seating","brass lanterns gleaming","sand-colored walls","geometric tile patterns","water fountains trickling","cool stone floors"],
  mountain: ["bear pelts on walls","snowshoes displayed","altitude chill outside","pine timber construction","trophy antlers mounted","thick wool blankets","stone fireplace massive","frost on windows"]
};

const MEAL_BASE = [
  {n:"Hearty stew", p:[8,14], dBits:["thick broth","root vegetables","barley"], side:["heel of bread","pickled onions","herb dumpling"]},
  {n:"Roast fowl", p:[10,18], dBits:["crisp skin","pan gravy"], side:["buttered greens","spiced carrots","oaten loaf slice"]},
  {n:"Vegetable pie", p:[7,12], dBits:["flaky crust","savory herbs"], side:["gravy boat","cress salad","chutney"]},
  {n:"Fisherman’s plate", p:[10,16], dBits:["pan-fried","lemon and herb"], side:["brown bread","peas and onions","tart sauce"]},
  {n:"Sausage & mash", p:[8,13], dBits:["onion gravy"], side:["braised cabbage","buttered peas","ale mustard"]},
  {n:"Herder’s platter", p:[6,11], dBits:["cheese wedge","cured meats"], side:["apple slices","pickles","rye heel"]},
  {n:"Spiced lentils", p:[6,10], dBits:["garlic oil","cumin"], side:["flatbread","yogurt spoon","parsley"]},
  {n:"Pottage of the day", p:[5,9], dBits:["seasonal vegetables"], side:["brown crust","chive butter","salt"]},
  {n:"Roast root medley", p:[6,10], dBits:["honey glaze","rosemary"], side:["seeded roll","sprig of thyme","herbed salt"]},
  {n:"Pie of the day", p:[7,14], dBits:["steam-piping","pepper"], side:["gravy boat","pickled relish","greens"]}
];
const DRINKS = {
  ale:[
    {n:"Amber ale", p:[3,6], notes:["malty","clean finish"]},
    {n:"Brown ale", p:[3,6], notes:["nutty","toffee hint"]},
    {n:"Dark stout", p:[4,7], notes:["roasted","creamy head"]},
    {n:"Honey wheat", p:[3,6], notes:["light","honeyed"]}
  ],
  cider:[
    {n:"Apple cider (sweet)", p:[3,5], notes:["orchard-fresh"]},
    {n:"Apple cider (dry)", p:[3,5], notes:["crisp","tannin edge"]},
    {n:"Pear cider", p:[3,5], notes:["soft fruit"]}
  ],
  wine:[
    {n:"Table red", p:[5,9], notes:["berry","dry"]},
    {n:"Table white", p:[5,9], notes:["floral","light"]},
    {n:"Mulled wine", p:[6,10], notes:["spiced","warm"]}
  ],
  spirits:[
    {n:"Grain spirit", p:[6,12], notes:["sharp","clean"]},
    {n:"Rye whiskey", p:[8,16], notes:["pepper","oak"]},
    {n:"Herbal bitters", p:[6,12], notes:["aromatic","digestif"]}
  ],
  soft:[
    {n:"Buttermilk", p:[2,4], notes:["cool","filling"]},
    {n:"Herbal tea", p:[2,4], notes:["mint","chamomile"]},
    {n:"Small beer", p:[2,4], notes:["very light"]}
  ]
};
// Cultural/Regional Menu Variants
const CULTURAL_MENU = {
  dwarven: {
    food: [
      {n:"Stone-baked mushroom bread", p:[4,8], dBits:["aged cheese"], side:["pickled radish","salt crystals","cave moss garnish"]},
      {n:"Deep-miner's stew", p:[7,12], dBits:["root vegetables","smoked meat"], side:["dark rye","stone-ground mustard","onion relish"]},
      {n:"Forge-roasted boar", p:[12,20], dBits:["crackling skin","juniper rub"], side:["mashed turnips","fermented cabbage","dark gravy"]},
      {n:"Cavern eel pie", p:[9,15], dBits:["flaky crust","peppercorns"], side:["pickled beets","horseradish cream","black bread"]},
      {n:"Ironbeard's meat platter", p:[14,22], dBits:["three roasted meats","charred edges"], side:["stone-ground mustard","pickled eggs","warrior's bread"]},
      {n:"Tunnel rat skewers", p:[6,10], dBits:["spiced rub","char-grilled"], side:["hot sauce","ale mustard","crispy onions"]},
      {n:"Gemstone root casserole", p:[8,13], dBits:["colorful root vegetables","butter crust"], side:["sour cream","chive butter","rye bread"]},
      {n:"Clan mother's dumplings", p:[7,11], dBits:["meat-filled","pan-fried"], side:["brown gravy","sauerkraut","black pepper"]},
      {n:"Anvil-smoked sausages", p:[9,14], dBits:["forge-smoked","pork and boar"], side:["spicy mustard","pickled vegetables","dark bread"]},
      {n:"Underground fish stew", p:[10,16], dBits:["blind cave fish","thick broth"], side:["stone crackers","dill butter","lemon wedge"]},
      {n:"Battlehammer beef ribs", p:[13,19], dBits:["slow-roasted","ale glaze"], side:["roasted potatoes","horseradish","coleslaw"]},
      {n:"Mithril Mine mushroom pie", p:[8,12], dBits:["seven mushroom types","cream sauce"], side:["garlic bread","parsley","grated cheese"]},
      {n:"Ancestor's feast platter", p:[16,24], dBits:["roasted meats","aged cheeses","preserved fish"], side:["assorted pickles","three mustards","bread basket"]},
      {n:"Stonecutter's sandwich", p:[6,9], dBits:["thick-cut meats","hard cheese"], side:["pickles","hot peppers","salt and vinegar chips"]},
      {n:"Deepforge onion soup", p:[5,9], dBits:["caramelized onions","beef broth"], side:["cheese toast","cracked pepper","sourdough"]},
      {n:"Clanhall roasted chicken", p:[11,17], dBits:["ale-brined","crispy skin"], side:["roasted roots","pan drippings","fresh bread"]}
    ],
    drinks: {
      ale: [
        {n:"Stonehammer stout", p:[4,8], notes:["very dark","malty","thick head"]},
        {n:"Deep ale", p:[5,9], notes:["aged in barrels","smoky","robust"]},
        {n:"Forge fire ale", p:[4,7], notes:["spiced","warming","copper-red"]},
        {n:"Ironfoot porter", p:[4,7], notes:["chocolate notes","smooth","creamy"]},
        {n:"Granite grey ale", p:[4,7], notes:["mineral finish","crisp","traditional"]},
        {n:"Coppervein amber", p:[4,8], notes:["toffee sweetness","balanced","sessionable"]},
        {n:"Battleaxe brown ale", p:[4,7], notes:["nutty","caramel","hearty"]},
        {n:"Cavern aged stout", p:[6,10], notes:["aged 5 years","complex","velvety"]},
        {n:"Miner's reward ale", p:[3,6], notes:["refreshing","light body","crisp finish"]},
        {n:"Clan chief's reserve", p:[7,12], notes:["barrel-aged","strong","prestigious"]}
      ],
      spirits: [
        {n:"Mountain whiskey", p:[10,18], notes:["peaty","aged 20 years","smooth"]},
        {n:"Stone liqueur", p:[8,14], notes:["herbal","mineral notes","digestif"]},
        {n:"Firebeard brandy", p:[9,16], notes:["fruit-based","oak-aged","warming"]},
        {n:"Underforge rum", p:[8,15], notes:["dark","molasses","spiced"]},
        {n:"Gemstone gin", p:[10,17], notes:["crystal clear","juniper","mineral water"]},
        {n:"Ancestor's vodka", p:[7,13], notes:["triple-distilled","pure","strong"]},
        {n:"Tunnel schnapps", p:[6,11], notes:["fruit spirits","smooth","traditional"]}
      ],
      wine: [
        {n:"Deepvault red", p:[8,14], notes:["aged underground","full-bodied","earthy"]},
        {n:"Stone cellar port", p:[9,16], notes:["sweet","fortified","rich"]}
      ],
      mead: [
        {n:"Mountain honey mead", p:[6,11], notes:["sweet","smooth","traditional"]},
        {n:"Battlehammer spiced mead", p:[7,12], notes:["cinnamon","clove","warming"]}
      ]
    }
  },
  elven: {
    food: [
      {n:"Starlight salad", p:[8,14], dBits:["edible flowers","berry vinaigrette"], side:["honey bread","crystallized ginger","mint sprig"]},
      {n:"Forest mushroom risotto", p:[10,16], dBits:["truffle oil","white wine"], side:["elderflower bread","herb butter","micro greens"]},
      {n:"Moonwell fish", p:[12,20], dBits:["delicate herbs","citrus glaze"], side:["wild rice","spring vegetables","lemon water"]},
      {n:"Sylvan berry tart", p:[7,12], dBits:["pastry cream","fresh berries"], side:["honeycomb","lavender sugar","mint tea"]},
      {n:"Twilight venison medallions", p:[14,22], dBits:["red wine reduction","wild herbs"], side:["roasted chestnuts","glazed carrots","rosemary potatoes"]},
      {n:"Dewdrop spring rolls", p:[6,11], dBits:["fresh vegetables","rice paper"], side:["plum sauce","mint leaves","sesame seeds"]},
      {n:"Sunbeam citrus chicken", p:[11,18], dBits:["lemon-herb marinade","tender breast"], side:["wild greens","candied orange","herb couscous"]},
      {n:"Enchanted garden soup", p:[7,13], dBits:["seven vegetables","flower petals"], side:["seed crackers","herb oil","edible blossoms"]},
      {n:"Moonlight pasta", p:[9,15], dBits:["silver mushrooms","cream sauce"], side:["garlic bread","parmesan","fresh basil"]},
      {n:"Feylight stuffed peppers", p:[8,14], dBits:["wild rice","nuts","herbs"], side:["yogurt sauce","pomegranate","fresh dill"]},
      {n:"Autumn harvest bowl", p:[10,16], dBits:["roasted vegetables","quinoa","tahini"], side:["flatbread","hummus","pickled vegetables"]},
      {n:"Silverwood smoked salmon", p:[13,19], dBits:["delicate smoke","dill cream"], side:["crisp bread","capers","lemon wedges"]},
      {n:"Ethereal cheese board", p:[11,17], dBits:["five artisan cheeses","honey drizzle"], side:["fruit compote","nuts","herbed crackers"]},
      {n:"Dreamleaf tea cakes", p:[6,10], dBits:["light sponge","lavender glaze"], side:["clotted cream","berry jam","edible flowers"]},
      {n:"Starfall fruit platter", p:[9,14], dBits:["exotic fruits","rose water"], side:["honey yogurt","candied petals","mint garnish"]},
      {n:"Whisperwind quail", p:[12,19], dBits:["honey-glazed","herb-roasted"], side:["wild rice","seasonal vegetables","berry reduction"]},
      {n:"Crystalbrook trout", p:[11,17], dBits:["pan-seared","almond crust"], side:["lemon butter","asparagus","herbed potatoes"]},
      {n:"Fae garden flatbread", p:[8,13], dBits:["fresh vegetables","goat cheese"], side:["balsamic glaze","arugula","olive oil"]}
    ],
    drinks: {
      wine: [
        {n:"Silverleaf white", p:[8,14], notes:["delicate","floral","crystal clear"]},
        {n:"Moonvine rosé", p:[9,16], notes:["slightly sweet","fruit forward","elegant"]},
        {n:"Starfruit wine", p:[12,20], notes:["rare","complex","aged 100 years"]},
        {n:"Twilight red", p:[9,15], notes:["light-bodied","berry notes","smooth"]},
        {n:"Sunblossom white", p:[7,13], notes:["crisp","citrus","refreshing"]},
        {n:"Moonpetal sparkling", p:[10,17], notes:["effervescent","floral","celebratory"]},
        {n:"Autumn harvest red", p:[8,14], notes:["earthy","balanced","food-friendly"]},
        {n:"Crystalbrook ice wine", p:[14,22], notes:["sweet","concentrated","dessert wine"]},
        {n:"Dreamleaf dessert wine", p:[11,18], notes:["honeyed","smooth","after-dinner"]}
      ],
      cider: [
        {n:"Golden apple cider", p:[5,9], notes:["sparkling","light","refreshing"]},
        {n:"Elderflower mead", p:[7,12], notes:["floral","delicate sweetness"]},
        {n:"Starfall pear cider", p:[6,10], notes:["crisp","fruity","elegant"]},
        {n:"Moonberry cider", p:[7,11], notes:["berry blend","slightly tart","refreshing"]},
        {n:"Silverwood perry", p:[6,10], notes:["pear wine","delicate","refined"]}
      ],
      spirits: [
        {n:"Moonflower liqueur", p:[10,16], notes:["floral","sweet","digestif"]},
        {n:"Starshine vodka", p:[9,15], notes:["pure","smooth","crystal clear"]},
        {n:"Feyberry brandy", p:[11,18], notes:["fruit-forward","aged","complex"]}
      ],
      tea: [
        {n:"Silverleaf tea", p:[3,6], notes:["delicate","calming","traditional"]},
        {n:"Moonblossom blend", p:[4,7], notes:["floral","aromatic","soothing"]},
        {n:"Forest berry tea", p:[3,6], notes:["fruity","antioxidant","refreshing"]}
      ]
    }
  },
  halfling: {
    food: [
      {n:"Second breakfast platter", p:[6,10], dBits:["eggs","bacon","sausage","mushrooms"], side:["toast","butter","jam","cheese"]},
      {n:"Threestack buttermilk pancakes", p:[5,8], dBits:["maple syrup","berry compote"], side:["whipped cream","honey butter","cinnamon"]},
      {n:"Comfort pie (meat and potato)", p:[8,13], dBits:["flaky crust","rich gravy"], side:["mashed peas","crusty bread","pickled onions"]},
      {n:"Garden vegetable quiche", p:[7,11], dBits:["farm-fresh eggs","three cheeses"], side:["green salad","herb bread","tomato chutney"]},
      {n:"Elevensies tea sandwiches", p:[5,9], dBits:["cucumber","cream cheese","smoked salmon"], side:["crisps","pickles","lemon water"]},
      {n:"Grandmother's chicken pot pie", p:[9,14], dBits:["creamy filling","golden crust"], side:["buttered carrots","gravy boat","biscuit"]},
      {n:"Farmhouse breakfast scramble", p:[6,10], dBits:["eggs","cheese","vegetables"], side:["sausage links","toast","fresh fruit"]},
      {n:"Cozy cottage shepherd's pie", p:[8,13], dBits:["lamb","vegetables","mashed potato top"], side:["brown bread","butter","apple sauce"]},
      {n:"Harvest festival casserole", p:[7,12], dBits:["seasonal vegetables","cheese sauce"], side:["dinner rolls","salad","cranberry relish"]},
      {n:"Bilberry scones with clotted cream", p:[4,7], dBits:["fresh-baked","warm"], side:["strawberry jam","honey","lemon curd"]},
      {n:"Mushroom and leek tart", p:[7,11], dBits:["buttery pastry","cream filling"], side:["mixed greens","vinaigrette","crusty bread"]},
      {n:"Roasted chicken with stuffing", p:[10,16], dBits:["herb-roasted","sage stuffing"], side:["mashed potatoes","gravy","green beans"]},
      {n:"Garden burger on brioche", p:[6,10], dBits:["vegetable patty","fresh toppings"], side:["chips","pickle","coleslaw"]},
      {n:"Honeyed ham sandwich", p:[5,8], dBits:["thick-cut ham","sweet glaze"], side:["cheese slice","mustard","apple slices"]},
      {n:"Afternoon tea cake", p:[5,8], dBits:["sponge cake","vanilla cream"], side:["fresh berries","powdered sugar","tea"]},
      {n:"Ploughman's platter", p:[8,12], dBits:["cheeses","bread","pickles"], side:["chutney","apple","celery"]},
      {n:"Buttermilk fried chicken", p:[9,14], dBits:["crispy coating","tender meat"], side:["mashed potatoes","coleslaw","biscuit with honey"]},
      {n:"Toad in the hole", p:[7,11], dBits:["sausages","Yorkshire pudding"], side:["onion gravy","peas","mashed potatoes"]},
      {n:"Blackberry cobbler", p:[6,9], dBits:["warm berries","biscuit topping"], side:["vanilla ice cream","whipped cream","mint sprig"]}
    ],
    drinks: {
      ale: [
        {n:"Longbottom leaf ale", p:[3,6], notes:["smooth","herbal notes","easy drinking"]},
        {n:"Harvest amber", p:[4,7], notes:["malty","caramel","crisp"]},
        {n:"Sunny day golden ale", p:[3,6], notes:["light","refreshing","sessionable"]},
        {n:"Hearthside brown ale", p:[4,7], notes:["nutty","toasty","comforting"]},
        {n:"Garden party pale ale", p:[4,7], notes:["hoppy","citrus","bright"]},
        {n:"Fireside red ale", p:[4,7], notes:["amber","smooth","balanced"]}
      ],
      cider: [
        {n:"Orchard cider (sweet)", p:[3,5], notes:["apple","pear","honey finish"]},
        {n:"Brambleberry cider", p:[4,6], notes:["tart","fruity","refreshing"]},
        {n:"Autumn apple cider", p:[3,5], notes:["crisp","traditional","warming"]},
        {n:"Strawberry fields cider", p:[4,6], notes:["sweet","berry","light"]},
        {n:"Perry pear cider", p:[4,6], notes:["delicate","fruity","elegant"]},
        {n:"Spiced harvest cider", p:[4,6], notes:["cinnamon","clove","warming"]}
      ],
      soft: [
        {n:"Creamy hot chocolate", p:[3,5], notes:["rich","marshmallows","comforting"]},
        {n:"Fresh-squeezed lemonade", p:[2,4], notes:["tart","sweet","refreshing"]},
        {n:"Buttermilk", p:[2,4], notes:["creamy","traditional","filling"]},
        {n:"Apple juice", p:[2,4], notes:["sweet","fresh","wholesome"]},
        {n:"Chamomile tea", p:[2,4], notes:["calming","floral","soothing"]}
      ],
      wine: [
        {n:"Dandelion wine", p:[5,9], notes:["sweet","floral","traditional"]},
        {n:"Blackberry wine", p:[5,9], notes:["fruity","smooth","dessert wine"]}
      ]
    }
  },
  orcish: {
    food: [
      {n:"Warbeast haunch", p:[10,18], dBits:["char-grilled","blood-rare center"], side:["bone marrow","fire-roasted peppers","coarse salt"]},
      {n:"Raider's stew", p:[8,14], dBits:["thick broth","game meat","root vegetables"], side:["hard flatbread","hot sauce","pickled eggs"]},
      {n:"Conquest feast platter", p:[15,25], dBits:["mixed roasted meats","primal spices"], side:["roasted bones","charred onions","warrior's bread"]},
      {n:"Battle rations (upgraded)", p:[6,10], dBits:["spiced jerky","hard cheese"], side:["rye bread","hot peppers","pickled garlic"]},
      {n:"Skullcrusher ribs", p:[12,20], dBits:["whole rack","spicy rub"], side:["charred corn","hot sauce","warrior bread"]},
      {n:"Warchief's bone soup", p:[7,13], dBits:["marrow broth","chunks of meat"], side:["hard bread","pickled onions","bone to gnaw"]},
      {n:"Blood sausage platter", p:[9,15], dBits:["grilled sausages","spiced"], side:["sauerkraut","mustard","dark bread"]},
      {n:"Axe-cleaved pork shoulder", p:[11,18], dBits:["slow-roasted","smoky"], side:["roasted potatoes","fire peppers","gravy"]},
      {n:"Hunter's whole chicken", p:[10,16], dBits:["fire-roasted","crispy skin"], side:["root vegetables","bone broth","flatbread"]},
      {n:"Berserker breakfast", p:[8,14], dBits:["eggs","bacon","sausage","steak"], side:["fried potatoes","toast","hot sauce"]},
      {n:"Trophy meat skewers", p:[9,15], dBits:["mixed game meats","char-grilled"], side:["spicy dip","onions","hard bread"]},
      {n:"War camp chili", p:[7,12], dBits:["beans","chunks of meat","very spicy"], side:["cornbread","sour cream","jalapeños"]},
      {n:"Stronghold smoked turkey leg", p:[8,13], dBits:["whole leg","hickory smoked"], side:["coleslaw","beans","bread"]},
      {n:"Battle-won venison steaks", p:[13,21], dBits:["thick cut","charred outside"], side:["wild mushrooms","potatoes","red wine sauce"]},
      {n:"Raider's roasted rabbit", p:[9,14], dBits:["whole rabbit","herb rub"], side:["root vegetables","gravy","bread"]},
      {n:"Spine-snapper lamb chops", p:[12,19], dBits:["grilled","garlic and rosemary"], side:["mashed potatoes","mint sauce","vegetables"]},
      {n:"Warlord's burger", p:[8,13], dBits:["massive beef patty","bacon"], side:["fried onions","cheese","spicy sauce"]},
      {n:"Pit-roasted whole fish", p:[10,16], dBits:["fire-cooked","stuffed with herbs"], side:["lemon","grilled vegetables","bread"]},
      {n:"Victory feast brisket", p:[14,22], dBits:["smoked for hours","tender"], side:["bbq sauce","pickles","toast"]}
    ],
    drinks: {
      ale: [
        {n:"Bloodaxe mead", p:[5,9], notes:["strong","honey-forward","spiced"]},
        {n:"War brew", p:[6,10], notes:["potent","smoky","thick"]},
        {n:"Skullcrusher stout", p:[5,9], notes:["very dark","heavy","bitter"]},
        {n:"Raider's red ale", p:[4,8], notes:["robust","malty","strong"]},
        {n:"Battle standard ale", p:[4,7], notes:["hearty","traditional","filling"]},
        {n:"Warchief's porter", p:[5,9], notes:["dark","smoky","bold"]},
        {n:"Berserker brew", p:[6,11], notes:["extra strong","spiced","kicks hard"]}
      ],
      spirits: [
        {n:"Fire water", p:[7,13], notes:["very strong","pepper finish","burns going down"]},
        {n:"Conquest rum", p:[8,14], notes:["dark","molasses","robust"]},
        {n:"Warlord's whiskey", p:[9,16], notes:["smoky","peaty","powerful"]},
        {n:"Blood liquor", p:[8,15], notes:["red color","spiced","strong"]},
        {n:"Axe handle vodka", p:[7,13], notes:["pure grain","very strong","harsh"]},
        {n:"War paint gin", p:[8,14], notes:["juniper","aggressive","bold"]},
        {n:"Trophy tequila", p:[8,15], notes:["agave","smoky","warrior's choice"]}
      ],
      mead: [
        {n:"Honey war mead", p:[5,10], notes:["sweet and strong","traditional","warrior's drink"]},
        {n:"Spiced battle mead", p:[6,11], notes:["cinnamon","clove","warming"]}
      ],
      soft: [
        {n:"Bull's blood (beet juice)", p:[3,5], notes:["earthy","energizing","red"]}
      ]
    }
  },
  coastal: {
    food: [
      {n:"Catch of the day", p:[9,15], dBits:["grilled","lemon butter"], side:["sea salt","crusty bread","seaweed salad"]},
      {n:"Clam chowder", p:[7,12], dBits:["creamy","bacon bits","fresh clams"], side:["oyster crackers","butter","parsley"]},
      {n:"Salt-crusted fish", p:[10,17], dBits:["whole fish","herb stuffing"], side:["roasted vegetables","aioli","lemon wedge"]},
      {n:"Sailor's stew", p:[8,13], dBits:["shellfish","tomato base"], side:["garlic bread","olive oil","red pepper flakes"]},
      {n:"Grilled lobster tail", p:[16,24], dBits:["butter-basted","charred"], side:["lemon wedges","drawn butter","roasted potatoes"]},
      {n:"Fish and chips", p:[8,12], dBits:["beer-battered","crispy"], side:["malt vinegar","tartar sauce","mushy peas"]},
      {n:"Crab cakes", p:[10,16], dBits:["pan-fried","lump crab"], side:["remoulade","lemon","mixed greens"]},
      {n:"Shrimp scampi", p:[11,17], dBits:["garlic butter","white wine"], side:["pasta","bread","parsley"]},
      {n:"Oyster platter", p:[12,19], dBits:["on the half shell","fresh"], side:["mignonette","lemon","crackers"]},
      {n:"Seafood paella", p:[13,20], dBits:["saffron rice","mixed seafood"], side:["lemon wedges","aioli","crusty bread"]},
      {n:"Mussels in white wine", p:[9,14], dBits:["steamed","garlic and herbs"], side:["bread for dipping","butter","parsley"]},
      {n:"Blackened swordfish", p:[12,18], dBits:["cajun spices","seared"], side:["rice","vegetables","lime"]},
      {n:"Tuna steak rare", p:[14,21], dBits:["sesame crusted","seared"], side:["wasabi","soy sauce","pickled ginger"]},
      {n:"Cioppino", p:[10,16], dBits:["fish stew","tomato base"], side:["sourdough","olive oil","garlic"]},
      {n:"Grilled octopus", p:[13,19], dBits:["charred tentacles","lemon"], side:["olive oil","potatoes","herbs"]},
      {n:"Fish tacos", p:[8,13], dBits:["grilled fish","slaw"], side:["lime","salsa","cilantro"]},
      {n:"Scallops seared", p:[15,22], dBits:["pan-seared","butter"], side:["risotto","asparagus","lemon"]},
      {n:"Anchovy toast", p:[6,10], dBits:["garlic bread","anchovies"], side:["olive oil","capers","tomatoes"]},
      {n:"Seafarer's sampler", p:[17,26], dBits:["lobster","shrimp","crab","oysters"], side:["cocktail sauce","butter","lemon"]},
      {n:"Salt cod fritters", p:[7,11], dBits:["fried","flaky fish"], side:["aioli","lemon","parsley"]}
    ],
    drinks: {
      spirits: [
        {n:"Sailor's rum", p:[6,11], notes:["spiced","caramel","smooth"]},
        {n:"Sea salt gin", p:[7,13], notes:["botanical","crisp","juniper"]},
        {n:"Navy grog", p:[7,12], notes:["rum-based","citrus","strong"]},
        {n:"Shipwreck whiskey", p:[8,14], notes:["barrel-aged","smoky","maritime"]},
        {n:"Tidewater vodka", p:[7,12], notes:["clean","filtered","smooth"]},
        {n:"Kraken spiced rum", p:[8,14], notes:["dark spices","vanilla","bold"]},
        {n:"Coastal brandy", p:[9,15], notes:["fruit-forward","aged","warming"]}
      ],
      wine: [
        {n:"Port wine", p:[8,14], notes:["sweet","fortified","ruby red"]},
        {n:"Coastal white", p:[7,12], notes:["crisp","seafood-friendly","citrus"]},
        {n:"Dockside rosé", p:[6,11], notes:["refreshing","fruity","light"]},
        {n:"Maritime red", p:[7,13], notes:["light-bodied","berry","easy-drinking"]}
      ],
      ale: [
        {n:"Harbor golden ale", p:[4,7], notes:["light","refreshing","sessionable"]},
        {n:"Dockworker's porter", p:[5,8], notes:["dark","roasted","hearty"]},
        {n:"Lighthouse lager", p:[4,7], notes:["crisp","clean","cold"]},
        {n:"Seaside IPA", p:[5,9], notes:["hoppy","citrus","bitter"]}
      ],
      soft: [
        {n:"Salted lime water", p:[2,4], notes:["refreshing","electrolytes","tangy"]},
        {n:"Ginger beer", p:[3,5], notes:["spicy","bubbly","zingy"]}
      ]
    }
  },
  desert: {
    food: [
      {n:"Spiced lamb tagine", p:[11,18], dBits:["apricots","cinnamon","saffron"], side:["flatbread","yogurt sauce","olive tapenade"]},
      {n:"Date and nut couscous", p:[7,12], dBits:["sweet dates","almonds","honey"], side:["mint tea","rose water","pistachios"]},
      {n:"Oasis kebabs", p:[9,15], dBits:["marinated meats","grilled vegetables"], side:["hummus","pita","tahini sauce"]},
      {n:"Honeyed pastries", p:[6,10], dBits:["flaky layers","nuts","sweet syrup"], side:["mint tea","dried fruit","candied ginger"]},
      {n:"Merguez sausage platter", p:[9,14], dBits:["spicy lamb","charred"], side:["harissa","flatbread","pickled vegetables"]},
      {n:"Shakshuka", p:[8,13], dBits:["eggs in tomato sauce","spices"], side:["pita bread","yogurt","fresh herbs"]},
      {n:"Falafel plate", p:[7,11], dBits:["crispy chickpea balls","fried"], side:["tahini","salad","pickles"]},
      {n:"Stuffed grape leaves", p:[6,10], dBits:["rice and herbs","rolled"], side:["lemon","yogurt sauce","olives"]},
      {n:"Bedouin roasted goat", p:[13,20], dBits:["slow-roasted","traditional spices"], side:["rice pilaf","grilled vegetables","yogurt"]},
      {n:"Camel meat stew", p:[10,16], dBits:["tender chunks","aromatic spices"], side:["flatbread","pickled onions","hot sauce"]},
      {n:"Spiced chickpea soup", p:[6,10], dBits:["cumin","lemon","garlic"], side:["bread","olive oil","parsley"]},
      {n:"Kofta platter", p:[10,16], dBits:["ground meat","grilled","spiced"], side:["rice","tahini","salad"]},
      {n:"Bastilla (meat pie)", p:[9,14], dBits:["phyllo pastry","cinnamon sugar top"], side:["salad","olives","preserved lemon"]},
      {n:"Zaalouk (eggplant)", p:[7,11], dBits:["smoky eggplant","tomatoes"], side:["bread","olives","olive oil"]},
      {n:"Harira soup", p:[6,10], dBits:["lentils","chickpeas","tomato"], side:["dates","bread","lemon wedge"]},
      {n:"Lamb shawarma wrap", p:[8,13], dBits:["shaved lamb","wrapped"], side:["tahini","pickles","hot sauce"]},
      {n:"Baked fish with chermoula", p:[11,17], dBits:["herb marinade","whole fish"], side:["rice","salad","lemon"]},
      {n:"Stuffed peppers", p:[8,13], dBits:["rice and meat","spiced"], side:["yogurt sauce","bread","salad"]},
      {n:"Maqluba (upside-down rice)", p:[10,15], dBits:["layered rice","meat","vegetables"], side:["yogurt","salad","pickles"]},
      {n:"Baklava", p:[5,8], dBits:["phyllo","nuts","honey syrup"], side:["mint tea","pistachios","rose water"]}
    ],
    drinks: {
      soft: [
        {n:"Mint tea (sweet)", p:[2,4], notes:["refreshing","aromatic","traditional"]},
        {n:"Rose water lemonade", p:[3,5], notes:["floral","cooling","sweet-tart"]},
        {n:"Spiced coffee", p:[3,5], notes:["cardamom","strong","energizing"]},
        {n:"Tamarind juice", p:[3,5], notes:["tart","sweet","cooling"]},
        {n:"Hibiscus tea (karkade)", p:[2,4], notes:["tart","red","iced"]},
        {n:"Date milk", p:[3,5], notes:["sweet","creamy","energizing"]},
        {n:"Almond milk", p:[3,5], notes:["nutty","refreshing","sweet"]}
      ],
      wine: [
        {n:"Desert red", p:[7,12], notes:["bold","spiced","full-bodied"]},
        {n:"Pomegranate wine", p:[8,14], notes:["fruity","tart","refreshing"]},
        {n:"Oasis white", p:[6,11], notes:["crisp","citrus","light"]},
        {n:"Date wine", p:[7,12], notes:["sweet","unusual","traditional"]}
      ],
      spirits: [
        {n:"Arak", p:[6,11], notes:["anise-flavored","clear","strong"]},
        {n:"Fig brandy", p:[8,14], notes:["sweet","fruit-forward","smooth"]},
        {n:"Spiced desert rum", p:[7,13], notes:["cinnamon","clove","warming"]}
      ],
      beer: [
        {n:"Oasis lager", p:[4,7], notes:["light","refreshing","crisp"]},
        {n:"Spiced ale", p:[5,8], notes:["cardamom","coriander","unique"]}
      ]
    }
  },
  mountain: {
    food: [
      {n:"Hearty mountain stew", p:[8,14], dBits:["elk meat","wild herbs","thick broth"], side:["sourdough","mountain cheese","pickled vegetables"]},
      {n:"Smoked trout", p:[10,16], dBits:["cold-smoked","dill cream"], side:["rye bread","butter","capers"]},
      {n:"Alpine fondue", p:[12,19], dBits:["three mountain cheeses","white wine"], side:["bread cubes","cornichons","apples"]},
      {n:"Game pie", p:[11,17], dBits:["venison","juniper berries","root vegetables"], side:["lingonberry jam","gravy","greens"]},
      {n:"Roasted wild boar", p:[13,20], dBits:["herb-crusted","crackling skin"], side:["roasted roots","apple sauce","red cabbage"]},
      {n:"Venison steaks", p:[14,21], dBits:["char-grilled","juniper rub"], side:["wild mushrooms","potatoes","berry sauce"]},
      {n:"Mountain goat curry", p:[10,16], dBits:["spiced","tender meat"], side:["rice","naan bread","yogurt"]},
      {n:"Raclette platter", p:[11,17], dBits:["melted cheese","potatoes"], side:["pickles","onions","cured meats"]},
      {n:"Shepherd's breakfast", p:[7,12], dBits:["eggs","sausage","potatoes"], side:["toast","beans","tomatoes"]},
      {n:"Grilled mountain lamb", p:[13,19], dBits:["rosemary","garlic"], side:["roasted vegetables","mint sauce","potatoes"]},
      {n:"Bear meat roast", p:[15,23], dBits:["slow-roasted","wild herbs"], side:["turnips","gravy","greens"]},
      {n:"Potato and leek soup", p:[6,10], dBits:["creamy","hearty"], side:["bread","butter","bacon bits"]},
      {n:"Roasted duck", p:[12,18], dBits:["crispy skin","orange glaze"], side:["wild rice","green beans","cranberry"]},
      {n:"Rabbit stew", p:[9,14], dBits:["white wine","vegetables"], side:["dumplings","bread","herbs"]},
      {n:"Sausage and sauerkraut", p:[8,13], dBits:["smoked sausage","tangy cabbage"], side:["mashed potatoes","mustard","rye bread"]},
      {n:"Grilled trout with almonds", p:[11,17], dBits:["pan-fried","butter sauce"], side:["green beans","lemon","new potatoes"]},
      {n:"Braised short ribs", p:[13,20], dBits:["fall-off-bone","rich sauce"], side:["mashed potatoes","carrots","bread"]},
      {n:"Mushroom and barley soup", p:[6,10], dBits:["wild mushrooms","hearty"], side:["sourdough","butter","herbs"]},
      {n:"Smoked elk sausage", p:[9,14], dBits:["house-smoked","spiced"], side:["sauerkraut","potatoes","mustard"]},
      {n:"Mountain cheese board", p:[10,16], dBits:["four aged cheeses","honey"], side:["nuts","fruit","crackers"]},
      {n:"Hiker's mixed grill", p:[14,21], dBits:["venison","boar","sausage"], side:["potatoes","vegetables","gravy"]}
    ],
    drinks: {
      spirits: [
        {n:"Pine liqueur", p:[8,14], notes:["herbal","evergreen","digestif"]},
        {n:"Mountain schnapps", p:[7,12], notes:["fruit-based","clear","warming"]},
        {n:"Alpine whiskey", p:[9,16], notes:["smoky","aged","smooth"]},
        {n:"Glacier vodka", p:[8,14], notes:["pure","ice-filtered","crisp"]},
        {n:"Berry brandy", p:[8,14], notes:["wild berries","sweet","warming"]},
        {n:"Gentian liqueur", p:[7,13], notes:["herbal","bitter","digestif"]},
        {n:"Stone pine grappa", p:[9,15], notes:["strong","herbal","traditional"]}
      ],
      ale: [
        {n:"Alpine lager", p:[4,7], notes:["crisp","clean","refreshing"]},
        {n:"Mountain honey ale", p:[5,8], notes:["sweet","smooth","golden"]},
        {n:"Summit amber", p:[5,8], notes:["malty","balanced","copper"]},
        {n:"Glacier pale ale", p:[5,9], notes:["hoppy","citrus","bright"]},
        {n:"Peak porter", p:[5,9], notes:["dark","chocolate","rich"]},
        {n:"Avalanche wheat beer", p:[4,7], notes:["light","cloudy","refreshing"]},
        {n:"Highland brown ale", p:[5,8], notes:["nutty","smooth","warming"]}
      ],
      wine: [
        {n:"Mountain red", p:[7,12], notes:["full-bodied","berry","earthy"]},
        {n:"Alpine white", p:[6,11], notes:["crisp","mineral","food-friendly"]},
        {n:"Ice wine", p:[12,19], notes:["sweet","concentrated","dessert"]}
      ],
      mead: [
        {n:"Wildflower mead", p:[6,11], notes:["floral","sweet","traditional"]},
        {n:"Spiced mountain mead", p:[7,12], notes:["cinnamon","warming","honey-forward"]}
      ],
      soft: [
        {n:"Pine needle tea", p:[2,4], notes:["refreshing","vitamin C","earthy"]},
        {n:"Hot spiced cider", p:[3,5], notes:["warming","cinnamon","comforting"]},
        {n:"Mountain spring water", p:[1,3], notes:["pure","cold","refreshing"]}
      ]
    }
  }
};

const HOUSE_TWISTS = [
  "house loaf served warm with herbed butter",
  "signature onion jam on the side",
  "smoked salt finish from a local kiln",
  "citrus-peel garnish on select plates",
  "pickled vegetables made in-house",
  "stoneware mugs stamped with a simple maker's circle",
  "the cook prefers a hint of clove in stews",
  "fresh herbs grown in window boxes",
  "brined meats for extra tenderness",
  "dessert is a rotating fruit tart slice"
];
const HOUSE_SPECIAL_DRINK = [
  "spiced ale warmed by the hearth",
  "cider with a ribbon of honey",
  "red wine mulled with orange peel",
  "dark stout floated with cream",
  "tea blend of mint and nettle",
  "clarified cider with a dash of bitters"
];

const TAVERN_EVENTS = [
  "A traveling bard has just arrived and is setting up in the corner",
  "Two patrons are engaged in a heated arm-wrestling contest",
  "A merchant is showing off exotic spices to anyone who will listen",
  "The cook just burned dinner and is frantically trying to fix it",
  "A group of off-duty guards are celebrating a recent promotion",
  "Someone's dog is begging for scraps under every table",
  "A mysterious cloaked figure sits alone in the darkest corner",
  "The local drunk is telling tall tales of their adventuring days",
  "A game of dice has attracted a small crowd of spectators",
  "Fresh flowers have been placed on every table for a local festival",
  "A heated political debate is occurring near the fireplace",
  "The barkeep is teaching a new server the ropes",
  "A patron is trying to sell a 'genuine magic item' to other customers",
  "Two old friends have just recognized each other after years apart",
  "Someone spilled a full pitcher of ale and staff are mopping it up",
  "A local noble has entered with their entourage, demanding service",
  "Children are daring each other to talk to the scariest-looking patron",
  "A traveling merchant is offering to buy unusual items from anyone",
  "The hearth fire is smoking badly and filling the room with haze",
  "A patron is sketching portraits and offering them for a few coins",
  "Someone left a mysterious package on a table and disappeared",
  "A group is singing drinking songs, getting louder with each verse",
  "Two patrons are arguing over a card game they claim was rigged",
  "A local farmer is complaining loudly about the weather ruining crops",
  "The cat has caught a mouse and is parading it around triumphantly",
  "A wealthy-looking traveler is interviewing people for hired help",
  "Someone's attempting to play a musical instrument poorly",
  "A patron is challenging others to riddle contests for drinks",
  "The staff are whispering about strange noises from the cellar",
  "A regular patron is celebrating their birthday with friends",
  "Two rival merchant families are dining on opposite sides, glaring",
  "A cleric is blessing meals for anyone who asks",
  "Someone claims they saw something unusual on the road here",
  "A patron is desperately looking for their lost coin purse",
  "The evening rush has just started and tables are filling fast",
  "A fortune teller is reading palms at a corner table for copper coins",
  "The kitchen staff are arguing loudly about a recipe",
  "A patron is teaching a card trick to fascinated onlookers",
  "Someone's trying to start a tab but the barkeep is suspicious",
  "A group of sailors just arrived, bringing the smell of salt air",
  "Two patrons are comparing scars and telling war stories",
  "A child is peeking through the windows, watching the adults inside",
  "The stablehand rushes in to report something wrong with the horses",
  "A patron is showing off a trained bird that steals food",
  "Someone accidentally sat in the town elder's usual spot",
  "A traveling tinker is demonstrating clever gadgets to customers",
  "The regular crowd is gossiping about someone who just left",
  "A patron dressed far too finely for this place just walked in",
  "Someone's trying to pawn jewelry to other patrons for quick coin",
  "The tavern keeper is sampling the new batch of ale with regulars",
  "A messenger bursts in asking if anyone's seen a specific person",
  "Two drunks are philosophizing loudly about the meaning of life",
  "A patron is arm-wrestling all comers for drinks",
  "Someone's crying quietly in a corner booth",
  "The evening storyteller has gathered an audience of children",
  "A game of chance has broken out with high stakes",
  "The local matchmaker is pointing out prospects to a shy patron",
  "Someone's trying to start a sing-along but getting no takers",
  "A patron is demonstrating impressive knife-throwing at a board",
  "The bouncer is watching a rowdy table with growing concern",
  "A group is planning an expedition and recruiting companions",
  "Someone's haggling with staff over a bill they dispute",
  "A patron is offering to arm-wrestle their trained monkey",
  "The cook is asking patrons to taste-test a new dish",
  "Two scholars are debating ancient history at increasing volume",
  "A patron claims they're nobility traveling incognito"
];

  // ----- Time-of-day / Tavern-type specific pools -----
  const EVENTS_BY_TIME = {
    dawn: ["A weary courier arrives asking for directions before leaving at first light","The cook rushes out to fetch a special ingredient for breakfast service"],
    morning: ["A delivery cart unloads fresh supplies at the back door","Local tradesfolk stop in for a quick meal before work"],
    afternoon: ["Travelers swap news of the road over watered ale","A minor scuffle breaks out between two itinerant merchants"],
    evening: ["Musicians set up as the room begins to fill for supper","A storyteller gathers children for tales by the fire"],
    night: ["A clandestine meeting takes place in a shadowed corner","Late-night gamblers start a high-stakes game"],
    midnight: ["A hooded figure slips a sealed note to the barkeep","Someone tries to bribe the bouncer to look the other way"]
  };

  // Bartender rumors by time of day (expanded)
  const BARTENDER_RUMORS_BY_TIME = {
    dawn: [
      "ship left at first light",
      "caravan due this morning",
      "a lamplighter was seen heading north",
      "fishermen returned with a strange catch"
    ],
    morning: [
      "the miller paid his debts",
      "a suspicious cart passed through",
      "a monk arrived with sealed letters",
      "the market herald announced new tariffs"
    ],
    afternoon: [
      "a well was struck nearby",
      "someone's lost dog returned",
      "a caravan traded exotic cloth",
      "a pair of foreign soldiers asked directions"
    ],
    evening: [
      "the lord seeks recruits",
      "a troupe performs tonight",
      "a new play premieres at the square",
      "a traveling merchant tells of a cursed idol"
    ],
    night: [
      "There's a gambling ring that only runs after dusk",
      "Someone's been selling strange tonics to sailors at night",
      "Late shipments keep arriving with no manifest",
      "A hush falls at the stroke of eleven when certain patrons arrive"
    ],
    midnight: [
      "A courier left a pouch with a strange sigil at the bar",
      "They say midnight is when the smugglers meet at the quay",
      "An unknown patron pays for a private room each new moon",
      "The cellar door has been opened in the dead of night recently"
    ]
  };

  // Bartender rumors by tavern type
  const BARTENDER_RUMORS_BY_TYPE = {
    noble: [
      "They pay well but ask for discretion",
      "Strange requests come from the upper floors late at night",
      "Servants whisper of sealed correspondence delivered after dark",
      "A valet once offered a coin to keep a secret about a guest"
    ],
    dwarven: [
      "A new gem vein was discovered deep in the mountains",
      "The clan brewmaster is experimenting with a new recipe",
      "There's talk of reopening the old deep mines",
      "A master smith is taking commissions for the first time in decades"
    ],
    elven: [
      "The forest has been singing differently lately",
      "An ancient grove was discovered with trees from before the kingdoms fell",
      "The seasonal wine this year is said to be exceptional",
      "Travelers report strange lights dancing in the Feywild borderlands"
    ],
    halfling: [
      "The harvest festival is going to be the biggest in a generation",
      "Someone's grandmother has a pie recipe that won at the capital",
      "A new pipeweed blend arrived from the southern shires",
      "The comfort chef is looking for rare ingredients for a special feast"
    ],
    orcish: [
      "A great beast was spotted in the nearby hills - perfect for a hunt",
      "The wrestling champion is seeking worthy challengers",
      "A war party returned with spoils and stories",
      "The honor guard is recruiting for an important mission"
    ],
    coastal: [
      "A ship came in with strange cargo from across the sea",
      "The fishing has been unusually good - or unusually strange",
      "Sailors report seeing lights beneath the waves at night",
      "A merchant vessel went missing between here and the next port"
    ],
    desert: [
      "A sandstorm revealed ruins that weren't there before",
      "The oasis waters are clearer than they've been in years",
      "Caravans report finding new routes through the dunes",
      "A rare spice shipment arrived that hasn't been seen in a decade"
    ],
    mountain: [
      "The pass will be snowed in within the week",
      "A mountaineer found a cave system no one's mapped before",
      "The high peaks are restless - avalanches have been frequent",
      "Hunters brought in a beast's pelt like nothing we've seen"
    ]
  };

  // Patron rumors keyed by settlement/quality/size
  const PATRON_RUMORS_BY_SETTLEMENT = {
    village: ["They whisper about the old hedge that seems to move","A shepherd found odd tracks by the brook"],
    town: ["The market guild is hiring muscle for night shifts","Someone paid a small fortune for a map recently"],
    capital: ["Nobles are arranging marriages behind closed doors","A courier vanished between two wards last week"]
  };
  const PATRON_RUMORS_BY_QUALITY = {
    fine: ["A rumor that a noble is recruiting discreetly","Talk of a forgery ring selling fake letters"]
  };
  const PATRON_RUMORS_BY_SIZE = {
    large: ["A traveling caravan left a strange crate in the stables","Many different accents suggest a broader rumor network"]
  };

  // Patron rumors keyed by time of day
  const PATRON_RUMORS_BY_TIME = {
    dawn: [
      "the bridge toll is waived at dawn",
      "someone lost a pouch by the quay",
      "fisherfolk traded a strange map",
      "a child found a brass key"
    ],
    morning: [
      "the baker's son is ill",
      "strange marks appeared on the trading post",
      "the apothecary ran out of a rare herb",
      "a cart overturned spilling letters"
    ],
    afternoon: [
      "a new house is rising by the lane",
      "a forester spotted a wounded stag",
      "the smith hired an extra hand",
      "a noble's carriage passed with curtains drawn"
    ],
    evening: [
      "a feast is planned at the manor",
      "a traveling bard knows a secret song",
      "the lamplighter forgot his route",
      "the apothecary sold a potion for bravery"
    ],
    night: [
      "a stranger seeks work under cover of dark",
      "folks avoid the old hollow",
      "someone lit a signal on the hill",
      "a cart rolled silently down an empty street"
    ],
    midnight: [
      "a secret meeting near the mill",
      "dogs howled till dawn last night",
      "a cloaked rider passed with haste",
      "the church bell rang out of turn"
    ]
  };

  // Patron rumors keyed by tavern type / mood
  const PATRON_RUMORS_BY_TYPE = {
    seedy: [
      "a fence bought a fine silver cup nearby",
      "the watch looks the other way for a price",
      "someone is buying stolen trinkets",
      "rumors of a confidence man in town"
    ],
    noble: [
      "a duel is whispered between two young lords",
      "the envoy carries sealed orders",
      "a dowry dispute reached the manor",
      "an heir was seen courting in disguise"
    ],
    roadhouse: [
      "bandits have been tracking the east road",
      "a bridge washed out last night",
      "a coach broke an axle outside town",
      "a courier lost his route amidst fog"
    ],
    inn: [
      "a lodger took a map leading into the hills",
      "someone left a chest under a bed",
      "a pair of travelers argued about coin",
      "an extra hand stayed the week for reasons"
    ],
    temple: [
      "the shrine received a strange votive",
      "a pilgrim vanished from the hostelry",
      "a novice is whispering of visions",
      "a relic's case was found unlocked"
    ],
    dwarven: [
      "a smith is forging something with a strange blue metal",
      "clan disputes over mining rights are getting heated",
      "someone found ancient dwarven runes in a collapsed tunnel",
      "the brewmaster's latest batch is rumored to be legendary"
    ],
    elven: [
      "the wine this season tastes of starlight and sorrow",
      "an elf claimed to have walked the Feywild paths",
      "someone heard the trees speaking warnings",
      "a vineyard produced grapes of an unknown variety"
    ],
    halfling: [
      "a family recipe was stolen and sold to a rival",
      "the pie contest winner used a secret ingredient",
      "someone's great-aunt is older than the town itself",
      "a legendary comfort dish is being served only once this year"
    ],
    orcish: [
      "a challenge was issued for the wrestling championship",
      "the war drums were heard from the northern clans",
      "a warrior returned from battle with a cursed weapon",
      "honor demands satisfaction for a slight from years past"
    ],
    coastal: [
      "a sailor claims to have seen a sea serpent",
      "smugglers are using the tide caves again",
      "a ship's crew mutinied and the captain was marooned",
      "strange fish are washing up on shore"
    ],
    desert: [
      "a caravan disappeared in a sandstorm and reappeared weeks later",
      "an oasis dried up overnight and no one knows why",
      "ancient treasures were found in newly exposed ruins",
      "a sand witch offers fortunes for the right price"
    ],
    mountain: [
      "a climbing party went missing on the high pass",
      "the mountain spirits are angry - avalanches come without warning",
      "a hermit living in the peaks knows secrets of the old world",
      "strange howls echo from caves that were thought empty"
    ]
  };
  const EVENTS_BY_TYPE = {
    seedy: ["A cutpurse eyes unattended purses under the tables","The back room is being used for an illicit dice ring"],
    noble: ["A well-dressed retinue demands a private dining area","Servants whisper about a secret engagement in the upstairs suite"],
    roadhouse: ["Riders hitch their horses and compare notes about the road ahead","Travelers swap information on blocked passes and fallen bridges"],
    temple: ["Pilgrims quietly offer thanks and share omens","A cleric quietly blesses meals for those who ask"],
    dwarven: ["An axe-throwing contest has drawn a rowdy crowd","Miners debate the richest veins discovered this season","A clan elder settles a dispute over mining rights","Patrons are comparing the quality of different forge techniques"],
    elven: ["A musician plays haunting melodies on an ancient flute","Poets engage in a battle of verses and wit","Someone shares a centuries-old tale of the Feywild","An artist is sketching portraits of patrons with incredible detail"],
    halfling: ["A pie-eating contest has just been announced","Families are sharing recipes and cooking tips","Someone is organizing a pipeweed tasting","Children are running between tables playing games while adults indulge"],
    orcish: ["A wrestling match is about to start in the cleared center area","Warriors are comparing battle scars and war stories","A drinking contest has attracted brave (or foolish) participants","Arm-wrestling challenges echo throughout the hall"],
    coastal: ["Sailors are singing sea shanties and swapping tales of storms","A fisherman is showing off today's unusual catch","Someone is recruiting crew members for an upcoming voyage","Patrons debate the best fishing spots and sailing routes"],
    desert: ["A spice merchant demonstrates exotic flavors to curious patrons","Travelers share stories of sandstorms and mirages","A storyteller weaves tales of ancient desert kingdoms","Nomads are trading maps and discussing caravan routes"],
    mountain: ["A guide is warning about recent avalanche activity","Hunters compare the quality of their furs and pelts","Someone rescued from a blizzard is recovering by the fire","Patrons swap stories of encounters with mountain beasts"]
  };

  const EVENTS_BY_SETTLEMENT = {
    village: ["Farmers argue about a ruined crop","A traveling peddler hawks odd trinkets"],
    town: ["A market seller disputes a price","Town criers announce a local ordinance"],
    capital: ["A city official inspects a ledger","A sedan chair arrives with important visitors"]
  };

  const EVENTS_BY_QUALITY = {
    rough: ["Spilled ale results in a shouting match","A brawl threatens the main table"],
    common: ["Regulars trade stories of local happenings","A server fumbles a tray but recovers with a joke"],
    cozy: ["A hearth-side storyteller charms a small group","The cook offers a complimentary sample"],
    fine: ["A private tasting is held upstairs","A well-dressed guest offers to pay for everyone's meal"]
  };

  const EVENTS_BY_SIZE = {
    small: ["Space is tight and patrons squeeze together","Local chatter is dominated by a single loud voice"],
    medium: ["A corner table hosts a lively family reunion","A troupe performs briefly between courses"],
    large: ["Several tables are reserved for a visiting delegation","A travelling merchant sets up a small stall inside"]
  };

  const BARTENDER_RUMORS_BY_SETTLEMENT = {
    village: [
      "There's talk of a missing oxen herd",
      "They suspect the miller's son knows more than he admits",
      "Some claim the well runs strange colors at dawn"
    ],
    town: [
      "A merchant is said to be skimming taxes",
      "The local magistrate is said to be ill",
      "A cart driver swears he saw a strange procession on the road"
    ]
  };
  const BARTENDER_RUMORS_BY_QUALITY = {
    fine: ["Someone paid oddly for a table and asked about private entrances","The cellar stores some rare vintages not for public sale"]
  };
  

const BARTENDER_RUMORS = [
  "I heard the old mill on the edge of town has strange lights at night",
  "A merchant caravan went missing on the north road last week",
  "The mayor's been meeting with some shady types after dark",
  "There's talk of bandits setting up camp in the Thornwood",
  "Someone found ancient coins while digging a new well",
  "The temple received a mysterious donation of gold",
  "A noble's prized horse vanished from a locked stable",
  "Fishermen are reporting the catch has been strange lately",
  "The blacksmith's forge went cold and won't relight, no matter what",
  "There's a reward posted for information about stolen livestock",
  "I heard singing coming from the old crypt last full moon",
  "A traveler swears they saw a ghost on the bridge",
  "The herbalist has been buying unusual ingredients in bulk",
  "Someone's been leaving flowers at the war memorial each dawn",
  "The town guard doubled patrols but won't say why",
  "A stranger's been asking questions about families that moved away",
  "There's talk the old Margrave's treasure was never found",
  "The well water tasted odd for three days, then returned to normal",
  "A peddler claims to have a map to a dragon's hoard",
  "Livestock keep breaking their fences on the east farms",
  "The lighthouse keeper hasn't been seen in town for weeks",
  "Someone saw hooded figures performing a ritual in the forest",
  "A child found a sword in the river, too fine for any local smith",
  "The beekeeper's hives all swarmed on the same day",
  "There's a new face in town staying at the fancy inn",
  "The old watchtower collapsed but no one heard it fall",
  "A merchant ship limped into port with half the crew missing",
  "The town archives were broken into but nothing seems stolen",
  "I've been getting strange orders for specific bottles of wine",
  "The judge has been acting paranoid, checking over his shoulder",
  "Someone's been paying good coin for information about the sewers",
  "A regular customer hasn't shown up in three weeks, very unlike them",
  "The local artist started painting disturbing scenes in their sleep",
  "I heard there's a new gambling den that only opens at midnight",
  "The baker's ovens won't stay lit past sunset for some reason",
  "A wealthy patron asked me about escape routes from town",
  "Someone tried to pay their tab with coins from a century ago",
  "The night watch found strange symbols chalked on several doors",
  "A customer whispered that the tax ledgers have been altered",
  "There's been a run on iron nails at the smithy, no one knows why",
  "I overheard guards talking about sealed orders from the capital",
  "The chandler's shop burned down, third fire on that street this year",
  "A patron mentioned seeing the same stranger in three different towns",
  "The cooper found a hidden compartment in a returned barrel",
  "Someone's buying up all the silver jewelry in the market",
  "I heard the old prison is being reopened for mysterious prisoners",
  "A ship's captain refused to sail, said the stars were wrong",
  "The magistrate's clerk has been asking odd questions about genealogy",
  "There's talk of a secret passage under the merchant's guild",
  "A customer paid me to remember who asks about them",
  "The town crier started announcing things that haven't happened yet",
  "I heard something howling in the hills that wasn't any wolf",
  "A patron showed me a wanted poster for someone who died years ago",
  "The midwife has been called to the manor house three times this week",
  "Someone's been stealing only left-handed gloves from the market",
  "I heard the executioner's axe went missing from the courthouse",
  "A regular swears they saw someone walking into the fog and vanish",
  "The price of salt has tripled and no one's saying why",
  "There's a new brothel in town but no one knows where it is",
  "I overheard two guards arguing about what to put in their reports",
  "A traveler left behind a journal written in a language nobody knows",
  "The apothecary has been asking about poisons, for research they say",
  "Someone's been leaving anonymous tips about crimes that haven't happened"
];

const PATRON_RUMORS = [
  "My cousin swears they saw a giant creature in the mountains",
  "I heard the Baron is looking to hire adventurers for something secret",
  "There's a cave system that was just discovered by miners",
  "The Silverpine family hasn't been seen at market in over a month",
  "Someone's been poaching in the royal hunting grounds",
  "A ship came into port flying no colors and left before dawn",
  "The astrologer predicted something big would happen this season",
  "I heard there's a secret fighting ring operating somewhere in town",
  "A traveling wizard is looking for rare components",
  "The old lighthouse is supposed to be haunted by its last keeper",
  "There's a hidden smuggler's route through the marshes",
  "Someone found a sealed letter from fifty years ago in an old book",
  "The harvest festival might be canceled due to crop failures",
  "A wandering knight challenged three guards to a duel and won",
  "There are wolves that are far too bold getting close to town",
  "I heard the Collector is looking for specific historical artifacts",
  "A fortune teller set up shop and was gone the next morning",
  "The cemetery caretaker quit suddenly without explanation",
  "There's talk of reopening the old silver mine",
  "A merchant is offering top coin for information about local legends",
  "Someone claims to have seen lights moving under the lake",
  "The tax collector is coming earlier than usual this year",
  "A fancy carriage with covered windows arrives every new moon",
  "I heard there's going to be a grand tournament next month",
  "The old hermit in the woods hasn't been seen in weeks",
  "My sister says the duchess is looking for a new food taster",
  "There's a bounty on wolves, but only ones with white paws",
  "I heard a merchant's entire warehouse inventory just vanished",
  "Someone saw a child speaking to animals in the market square",
  "The old Thornwood estate is being prepared for new residents",
  "A stranger's been buying every map of the region they can find",
  "My uncle claims he saw a door in the cliff face that wasn't there before",
  "There's talk that the old war is flaring up again in the north",
  "I heard someone's been grave robbing in the pauper's cemetery",
  "A traveling merchant showed me a coin I've never seen before",
  "The Widow Marsh swears her dead husband visited her last night",
  "Someone's offering triple wages for guards willing to work nights",
  "I heard the guild master's daughter ran away with a street performer",
  "There's a standing reward for anyone who can explain the crop circles",
  "My nephew found a tunnel under his house that goes who knows where",
  "A group of monks arrived asking questions about ancient bloodlines",
  "I heard someone's been impersonating the river warden",
  "The old ruins outside town are supposedly cursed ground",
  "A merchant claimed their competitor is using illegal trade practices",
  "Someone saw a figure in white walking through walls at the castle",
  "I heard the queen's cousin is traveling in disguise through the realm",
  "There's word of a plague ship that was turned away from the port",
  "My brother-in-law knows someone who found a hidden room full of books",
  "Someone's been asking dock workers about ships that sail without crews",
  "I heard there's a reward for capturing a specific bird alive",
  "The old battlefield north of here is supposedly haunted by soldiers",
  "A peddler told me the road west has been blocked by fallen trees",
  "Someone claims the stone circle in the meadow moves during storms",
  "I heard a noble's bastard child has surfaced claiming inheritance",
  "There's talk of strange tracks found near the sheep pastures",
  "My friend's friend knows someone who can get you fake documents",
  "I heard the king is planning to visit the region unannounced",
  "Someone found a cache of weapons hidden in an abandoned barn",
  "The local soothsayer predicted three deaths before winter",
  "I heard there's a reward for information about a missing heirloom",
  "Someone claimed they saw a mermaid in the harbor at dawn",
  "There's word the forest to the east is growing faster than natural",
  "I heard a deserter from the army is hiding somewhere nearby"
];

const STAFF_ROLES = ["Proprietor","Barkeep","Cook","Server","Server"];
const AGE = ["young adult","middle-aged","older","elderly","seasoned","fresh-faced","spry elder","timeworn"];
const BUILD = ["slight","lean","average","sturdy","broad-shouldered","lithe","stocky","wiry","compact","athletic"];
const HAIR_STYLE = ["short-cropped","curly","straight","braided","shaved","shoulder-length","coiled","loose waves","ringlets","messy bun"];
const HAIR_COLOR = ["dark","fair","ginger","gray-streaked","white","sandy","jet-black","chestnut","auburn","ash-blond"];
const EYES = ["grey","brown","green","blue","hazel","amber"];
const ATTIRE = ["work-stained apron","patched cloak","neat tunic","travel-worn coat","simple uniform","layered shawl","tool belt and vest","well-kept robes","rolled-up sleeves","sturdy boots"];
const DEMEANOR = ["brisk","courteous","cheerful","wary","even-tempered","no-nonsense","patient","eager","soft-spoken","forthright"];
const VOICE_TIMBRE = ["warm","raspy","nasal","gravelly","breathy","clear","booming","soft","reedy","velvety"];
const VOICE_PITCH = ["low","mid","high","baritone","alto"];
const VOICE_ACCENT = ["local lilt","coastal drawl","northern clip","merchant cant","street patter","formal diction","sing-song inflection"];
const MANNER = ["rubs thumb and forefinger","tilts head before answering","drums fingers on surfaces","keeps hands clasped","taps foot softly","hums under breath","adjusts spectacles","checks pocket contents","fidgets with a ring","smooths hair back"];

const STAFF_BY_TYPE = {
  dwarven: {
    attire: ["leather apron over chain mail","clan symbol embroidered vest","stone-dust covered work clothes","braided leather vest","forge-warmed tunic"],
    demeanor: ["gruff but fair","proudly traditional","clan-loyal","stone-steady","hearty and booming"],
    manner: ["strokes braided beard","inspects quality of tankards","speaks in clan proverbs","adjusts clan ring","taps fingers like a hammer rhythm"],
    accent: ["deep mountain burr","clan dialect","stone-carver's cadence"]
  },
  elven: {
    attire: ["flowing silk with leaf patterns","moonsilver jewelry","gossamer-light robes","nature-embroidered vest","star-motif tunic"],
    demeanor: ["graceful and serene","ancient and patient","melodic and flowing","ethereal yet present","timelessly courteous"],
    manner: ["moves with fluid grace","speaks in verse occasionally","touches living wood reverently","tilts head listening to distant sounds","traces patterns in the air"],
    accent: ["lyrical and musical","forest-whisper soft","ancient tongue traces"]
  },
  halfling: {
    attire: ["flour-dusted comfortable vest","patchwork apron with many pockets","cozy knitted cardigan","homespun tunic","well-worn comfortable shoes"],
    demeanor: ["warm and welcoming","grandmotherly caring","infectiously cheerful","comfort-focused","family-oriented"],
    manner: ["offers extra helpings unprompted","pats shoulders reassuringly","wipes hands on apron frequently","hums cheerful tunes","checks if guests are comfortable"],
    accent: ["homey and warm","rural gentle lilt","storyteller's cadence"]
  },
  orcish: {
    attire: ["battle-scarred leather vest","trophy bones woven into clothing","war paint remnants","tribal warrior garb","rough-sewn practical gear"],
    demeanor: ["direct and unflinching","honor-bound","fierce but loyal","battle-hardened","straightforward"],
    manner: ["maintains intense eye contact","speaks in short powerful statements","displays scars openly","stands with warrior's stance","grips forearms in greeting"],
    accent: ["guttural and forceful","war-camp dialect","primal and commanding"]
  },
  coastal: {
    attire: ["salt-stained sailor's vest","rope-belt work clothes","weather-beaten sea coat","netting-adorned apron","tide-worn practical gear"],
    demeanor: ["weather-wise and knowing","sailor's superstitious","tide-timed efficient","sea-story rich","storm-tested calm"],
    manner: ["checks the wind direction often","speaks in nautical terms","ties and unties knots absently","scans horizons habitually","walks with sea-leg sway"],
    accent: ["sailor's rolling drawl","port-town blend","sea-shanty rhythm"]
  },
  desert: {
    attire: ["flowing sand-colored robes","spice-scented silk wrappings","sun-protective layered garments","geometric patterned vest","oasis-blue sash"],
    demeanor: ["hospitable and generous","desert-wise reserved","water-conscious careful","caravan-cultured worldly","shade-keeper calm"],
    manner: ["offers water first always","shields eyes when looking outside","speaks of stars and dunes","adjusts head wrapping frequently","moves with heat-efficient grace"],
    accent: ["desert kingdoms' formal speech","caravan-route polyglot","spice-trader's eloquence"]
  },
  mountain: {
    attire: ["fur-trimmed mountain gear","altitude-practical layers","avalanche-ready sturdy clothes","peak-climber's vest","weathered hiking boots"],
    demeanor: ["mountain-tough resilient","altitude-quiet contemplative","avalanche-alert vigilant","peak-wise experienced","lodge-keeper protective"],
    manner: ["checks weather constantly","speaks of passes and peaks","keeps emergency supplies close","listens to wind patterns","stamps feet to keep warm"],
    accent: ["high-altitude thin speech","mountain-folk clipped","lodge-keeper's measured tones"]
  }
};

/* ---------- Inn Sign Name Pools + builder ---------- */
const SIGN_COLORS = ["Red","Blue","Black","White","Golden","Silver","Green","Brown","Scarlet","Crimson","Emerald","Sable","Azure","Ivory","Amber"];
const SIGN_TRAITS = ["Prancing","Sleeping","Laughing","Roaring","Leaping","Dancing","Crowned","Gilded","Lucky","Winking","Crooked","Humble","Wary","Merry","Rusty"];
const SIGN_ANIMALS = ["Fox","Boar","Stag","Bear","Hound","Swan","Badger","Horse","Ram","Hare","Cock","Goat","Ox","Wolf","Mermaid","Dragon","Griffin","Unicorn"];
const SIGN_OBJECTS = ["Crown","Anchor","Anvil","Bell","Wheel","Lantern","Rose","Gate","Star","Key","Barrel","Boot","Flask","Crescent","Hammer","Plough","Ship","Candle"];
const SIGN_TITLES = ["King","Queen","Knight","Maiden","Miller","Cooper","Shepherd","Sailor","Smith","Bishop","Hunter","Innkeeper","Carpenter","Potter","Tailor"];
const SIGN_NUMS = ["Two","Three","Four","Seven","Nine","Twelve"];

// ---------- Patron Pools ----------
const PATRON_TYPES = [
  "local regular","traveling merchant","off-duty guard","farmer","craftsperson","sellsword",
  "pilgrim","gambler","scholar","miner","sailor","peddler","tinker","hunter","herbalist",
  "wandering bard","caravan guard","apprentice wizard","young noble","old soldier","thief",
  "courier","scribe","acolyte","hedge witch","fortune teller","bounty hunter","shipwright",
  "inn lodger","stable hand","market hawker","coachman","drayman","house servant","street urchin",
  "itinerant artisan","map seller","fortune seeker","herbal gatherer","festival performer","dog trainer",
  "bookbinder","cloth merchant","leatherworker","coppersmith","fishmonger","silk trader"
];

const PATRON_QUIRKS = [
  "missing a finger","scar across cheek","nervous twitch","tattoo on neck","eye patch","gold tooth",
  "walks with a limp","constantly polishing a coin","chewing on a pipe stem","fidgeting with cards",
  "reading a crumpled letter","sharpening a knife","counting coins repeatedly","whittling wood",
  "humming a tune","tapping fingers rhythmically","checking the door frequently","wearing a lucky charm",
  "speaking in whispers","overly loud laugh","perpetually yawning","cleaning fingernails with dagger",
  "keeps a small notebook","wears a stained cloak","obsessively cleans boots","smells faintly of lavender",
  "keeps a lucky coin on a string","tucks a ribbon into hat","has soot under nails","sings softly to self"
];

const PATRON_HOOKS = [
  "looking for work","celebrating a recent windfall","drowning sorrows","meeting someone secretly",
  "hiding from someone","spreading news from afar","seeking adventurers for a job","playing cards/dice",
  "telling tall tales","eavesdropping on conversations","waiting for a contact","arguing about politics",
  "bragging about past exploits","complaining about taxes","nursing an old wound","selling something under the table",
  "recruiting for a cause","warning about danger nearby","seeking revenge","trying to charm the staff",
  "sketching the room in a journal","listening to gossip intently","brooding over a map","teaching someone a game",
  "trading rumors for drinks","showing off a trophy","asking about local legends","looking for someone who went missing",
  "seeking a lost heirloom","trying to recruit for a caravan","looking for medical help","hiding contraband",
  "seeking directions","testing a forged letter","offering to sell a map","looking for a safe bed"
];
// Context-specific patron pools
const PATRON_TYPES_BY_SETTLEMENT = { 
  village: ["smallholding farmer","itinerant shepherd","local storyteller","miller's apprentice"], 
  town: ["market trader","coachman","guild journeyman","apothecary's helper"], 
  capital: ["court clerk","merchant agent","city watch","minor noble's retainer"] };
const PATRON_TYPES_BY_QUALITY = {
  rough: ["drunken laborer","roughlancer","coalman","barnhand","river scull"],
  common: ["marketgoer","apprentice","town clerk","baker's helper","shop assistant"],
  cozy: ["family group","local teacher","quilting circle member","hearth-side poet"],
  fine: ["genteel traveler","retired officer","tastemaker","dressed envoy","patron of the arts"]
};
const PATRON_TYPES_BY_SIZE = {
  small: ["local farmer","weaver's apprentice"],
  medium: ["regional merchant","travelling minstrel"],
  large: ["distant noble","merchant caravan leader","importer"]
};
const PATRON_TYPES_BY_TIME = {
  dawn: [
    "weary courier",
    "early milker",
    "milking hand returning from fields",
    "dawn market runner",
    "courier with a satchel"
  ],
  morning: [
    "delivery driver",
    "market buyer",
    "street vendor setting up",
    "apprentice running errands",
    "traveler grabbing a quick bite before the road"
  ],
  afternoon: [
    "coach passenger",
    "day laborer",
    "itinerant artisan",
    "postal clerk on a break",
    "caravan scout"
  ],
  evening: [
    "families dining",
    "supper crowd",
    "musician warming up",
    "guild journeyman stopping after work",
    "local teacher with students"
  ],
  night: [
    "late-shift worker",
    "drifter",
    "night watch",
    "barback cleaning up",
    "shadowed traveler"
  ],
  midnight: [
    "shadowy visitor",
    "mysterious courier",
    "cloak-and-dagger messenger",
    "silent passenger slipping upstairs",
    "someone with a sealed parcel"
  ]
};
const PATRON_TYPES_BY_TYPE = {
  seedy: [
    "cutpurse",
    "shady fence",
    "beggarman",
    "back-alley informant",
    "sly bookie"
  ],
  noble: [
    "retinue member",
    "lady-in-waiting",
    "private tutor",
    "minor courtier",
    "sommelier from the manor"
  ],
  roadhouse: [
    "wagon driver",
    "relay rider",
    "traveler with mud-splattered cloak",
    "circus hand",
    "merchant of odd wares"
  ],
  inn: [
    "long-term lodger",
    "inn valet",
    "hired hand lodging for the week",
    "traveler on extended leave",
    "outsourced carriage caretaker"
  ],
  temple: [
    "silent pilgrim",
    "cleric's novice",
    "itinerant scribe",
    "lay devotee",
    "votive-offering seller"
  ],
  dwarven: [
    "dwarven smith",
    "stone mason",
    "mining foreman",
    "gemcutter",
    "brewmaster's apprentice",
    "clan historian",
    "tunnel engineer"
  ],
  elven: [
    "elven musician",
    "forest warden",
    "scroll keeper",
    "arcane botanist",
    "weaver of moonsilk",
    "star reader",
    "vintner's assistant"
  ],
  halfling: [
    "halfling baker",
    "pipeweed merchant",
    "comfort chef",
    "quilting circle member",
    "family patriarch",
    "storytelling grandmother",
    "pie contest judge"
  ],
  orcish: [
    "war-scarred veteran",
    "beast trainer",
    "tribal emissary",
    "wrestling champion",
    "honor guard",
    "clan armorer",
    "raiding party member"
  ],
  coastal: [
    "weathered sailor",
    "net mender",
    "ship's carpenter",
    "pearl diver",
    "tide caller",
    "fishmonger",
    "lighthouse keeper"
  ],
  desert: [
    "caravan master",
    "spice merchant",
    "sand guide",
    "oasis keeper",
    "nomad trader",
    "water diviner",
    "silk road traveler"
  ],
  mountain: [
    "mountain guide",
    "avalanche survivor",
    "fur trapper",
    "alpine shepherd",
    "lodge keeper",
    "ice climber",
    "ranger from the peaks"
  ]
};

const PATRON_QUIRKS_BY_CONTEXT = {
  capital: [
    "keeps a ledger of names",
    "speaks in clipped tones",
    "adjusts a signet ring",
    "uses formal greetings",
    "presents calling cards",
    "notes conversations in shorthand"
  ],
  fine: [
    "checks napkin for stains",
    "twitches when servants pass",
    "inspects cutlery",
    "smells faint perfume",
    "sips wine with tilted pinky",
    "keeps a tasting journal"
  ],
  seedy: [
    "constantly scans the room",
    "finger always near a dagger",
    "hunched shoulders",
    "avoids eye contact",
    "cleans a small knife obsessively",
    "taps coins under the table"
  ],
  night: [
    "whispers about routes they traveled",
    "covers face with hood",
    "keeps coin pouch hidden",
    "checks alleyways through windows",
    "speaks in hushed timbre"
  ],
  village: [
    "smells of fresh hay",
    "calls everyone by name",
    "boots full of straw",
    "greets like family",
    "brings a small woven trinket"
  ],
  town: [
    "keeps tally on a scrap of paper",
    "uses local slang",
    "smudged ink on fingers",
    "bumps elbows with merchants",
    "polishes a small brass token"
  ],
  middle: [
    "fidgets with a pocket watch",
    "keeps checking the door",
    "smooths a dusty coat"
  ]
};

const PATRON_HOOKS_BY_CONTEXT = {
  village: [
    "talking about a bad harvest",
    "looking for hired hands",
    "asking about seed prices",
    "seeking tradesmen recommendations"
  ],
  capital: [
    "looking for employment at court",
    "seeking news from the capital",
    "asking about travel permits",
    "pursuing introductions to officials"
  ],
  fine: [
    "seeking invitations to salons",
    "discussing theatre schedules",
    "arranging private tastings",
    "hosting a discreet gathering"
  ],
  seedy: [
    "selling rumors for a coin",
    "looking to recruit for shady work",
    "trying to fence a trinket",
    "asking who will watch the door tonight"
  ],
  roadhouse: [
    "asking about road conditions",
    "looking for a stable hand",
    "seeking news of bandit sightings"
  ],
  morning: [
    "buying supplies for the day",
    "looking for early work",
    "asking for the fastest route to market"
  ],
  afternoon: [
    "seeking shelter from heat",
    "looking for an afternoon ale",
    "trying to find a temporary job"
  ],
  night: [
    "looking for a late job",
    "hunting information after dark",
    "asking about hidden rooms or back doors"
  ]
};
