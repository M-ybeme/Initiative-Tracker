  const SPELLS_DATA = [
    /* ===== A ===== */
    {
      title: "Acid Arrow",
      level: 2, school: "Evocation",
      casting_time: "1 action",
      range: "90 ft",
      components: "V,S,M",
      duration: "Instantaneous (plus ongoing)",
      concentration: false,
      classes: ["Wizard"],
      body: `Ranged spell attack dealing acid damage now and again at the end of the target’s next turn.`,
      tags: ["damage","acid","attack","ranged"]
    },
    {
      title: "Acid Splash",
      level: 0, school: "Conjuration",
      casting_time: "1 action",
      range: "60 ft",
      components: "V,S",
      duration: "Instantaneous",
      concentration: false,
      classes: ["Sorcerer","Wizard"],
      body: `Dex save or take acid damage. You can target two creatures if they’re within 5 feet of each other.`,
      tags: ["cantrip","damage","acid","save"]
    },
    {
      title: "Aid",
      level: 2, school: "Abjuration",
      casting_time: "1 action",
      range: "30 ft",
      components: "V,S,M",
      duration: "8 hours",
      concentration: false,
      classes: ["Cleric","Paladin","Artificer"],
      body: `Choose up to three creatures. Each increases current and max HP by a flat amount for the duration.`,
      tags: ["buff","hp","no concentration","party"]
    },
    {
      title: "Alarm",
      level: 1, school: "Abjuration (ritual)",
      casting_time: "1 minute",
      range: "30 ft (area up to a 20-ft cube) / Touch (object/door)",
      components: "V,S,M",
      duration: "8 hours",
      concentration: false,
      classes: ["Ranger","Wizard","Artificer"],
      body: `Wards an area/object. You choose a mental ping or audible alarm when a Tiny+ creature enters (with exceptions you set).`,
      tags: ["ritual","utility","security","downtime"]
    },
    {
      title: "Alter Self",
      level: 2, school: "Transmutation",
      casting_time: "1 action",
      range: "Self",
      components: "V,S",
      duration: "Up to 1 hour",
      concentration: true,
      classes: ["Sorcerer","Wizard"],
      body: `Pick a mode and switch as an action: change appearance; grow natural weapons; adapt for water (swim + breathe).`,
      tags: ["self-buff","shapechange","mobility","stealth"]
    },
    {
      title: "Animal Friendship",
      level: 1, school: "Enchantment",
      casting_time: "1 action",
      range: "30 ft",
      components: "V,S,M",
      duration: "24 hours",
      concentration: false,
      classes: ["Bard","Druid","Ranger"],
      body: `Beast of low intellect must save or be charmed by you; it won’t attack you or your companions while charmed.`,
      tags: ["beast","charm","social"]
    },
    {
      title: "Animal Messenger",
      level: 2, school: "Enchantment (ritual)",
      casting_time: "1 action",
      range: "30 ft (to beast)",
      components: "V,S,M",
      duration: "24 hours",
      concentration: false,
      classes: ["Bard","Druid","Ranger"],
      body: `A Tiny beast carries a short verbal message to a designated recipient within range/time you set.`,
      tags: ["ritual","utility","social"]
    },
    {
      title: "Animal Shapes",
      level: 8, school: "Transmutation",
      casting_time: "1 action",
      range: "30 ft",
      components: "V,S",
      duration: "Up to 24 hours",
      concentration: true,
      classes: ["Druid"],
      body: `Transform many willing creatures into powerful beast forms (you can change forms later). Great mass-buff and scouting tool.`,
      tags: ["mass-polymorph","party","exploration","combat"]
    },
    {
      title: "Animate Dead",
      level: 3, school: "Necromancy",
      casting_time: "1 minute",
      range: "10 ft",
      components: "V,S,M",
      duration: "Instantaneous (control lasts 24h)",
      concentration: false,
      classes: ["Cleric","Wizard"],
      body: `Create or reassert control over skeletons or zombies from bones/corpse. You must re-cast daily to maintain control.`,
      tags: ["minions","undead","downtime"]
    },
    {
      title: "Animate Objects",
      level: 5, school: "Transmutation",
      casting_time: "1 action",
      range: "120 ft",
      components: "V,S",
      duration: "Up to 1 minute",
      concentration: true,
      classes: ["Bard","Sorcerer","Wizard","Artificer"],
      body: `Animate up to 10 unattended objects; they become flying attackers with stats by size. Bonus action to command.`,
      tags: ["summon","damage","control","minions"]
    },
    {
      title: "Antilife Shell",
      level: 5, school: "Abjuration",
      casting_time: "1 action",
      range: "Self (10-ft radius)",
      components: "V,S",
      duration: "Up to 1 hour",
      concentration: true,
      classes: ["Druid"],
      body: `A mobile barrier prevents living creatures from entering or reaching through. You can push it through creatures, but they can’t enter.`,
      tags: ["defense","zone","control"]
    },
    {
      title: "Antimagic Field",
      level: 8, school: "Abjuration",
      casting_time: "1 action",
      range: "Self (10-ft radius)",
      components: "V,S,M",
      duration: "Up to 1 hour",
      concentration: true,
      aliases: ["Anitmagic Field"], // for your note typo
      classes: ["Cleric","Wizard"],
      body: `Suppresses spells, magic items, summoned creatures, and magical effects in the area (some artifacts/deities may ignore).`,
      tags: ["counter-magic","zone","control"]
    },
    {
      title: "Antipathy/Sympathy",
      level: 8, school: "Enchantment",
      casting_time: "1 hour",
      range: "60 ft",
      components: "V,S,M",
      duration: "10 days",
      concentration: false,
      aliases: ["Antipathy Sympathy"],
      classes: ["Druid","Wizard"],
      body: `Imbue a creature or object to strongly repel or attract a chosen creature type. Targets save when first affected and on subsequent exposure.`,
      tags: ["control","charm","long-term"]
    },
    {
      title: "Arcane Eye",
      level: 4, school: "Divination",
      casting_time: "1 action",
      range: "30 ft (creation point)",
      components: "V,S,M",
      duration: "Up to 1 hour",
      concentration: true,
      classes: ["Wizard"],
      body: `Create an invisible sensor you can move to scout through openings. You see through it freely.`,
      tags: ["scouting","sensor","invisible"]
    },
    {
      title: "Arcane Hand",
      level: 5, school: "Evocation",
      casting_time: "1 action",
      range: "120 ft",
      components: "V,S,M",
      duration: "Up to 1 minute",
      concentration: true,
      aliases: ["Bigby’s Hand","Bigbys Hand"],
      classes: ["Sorcerer","Wizard"],
      body: `Summons a Large spectral hand to strike, shove, interpose, or grasp using your bonus action each round.`,
      tags: ["control","damage","force","battlefield"]
    },
    {
      title: "Arcane Lock",
      level: 2, school: "Abjuration",
      casting_time: "1 action",
      range: "Touch",
      components: "V,S,M",
      duration: "Until dispelled",
      concentration: false,
      classes: ["Wizard","Artificer"],
      body: `Magically reinforces a door, chest, or opening. You set a password; knock/Dispel Magic can bypass.`,
      tags: ["utility","security","object"]
    },
    {
      title: "Arcanist’s Magic Aura",
      level: 2, school: "Illusion",
      casting_time: "1 action",
      range: "Touch",
      components: "V,S,M",
      duration: "24 hours",
      concentration: false,
      classes: ["Wizard"],
      body: `Mask or alter a creature’s/object’s magical signature (type, alignment aura, creature type, etc.) for divinations/detection.`,
      tags: ["utility","stealth","divination-counter"]
    },
    {
      title: "Astral Projection",
      level: 9, school: "Necromancy",
      casting_time: "1 hour",
      range: "10 ft",
      components: "V,S,M (costly)",
      duration: "Special",
      concentration: false,
      classes: ["Cleric","Warlock","Wizard"],
      body: `Project souls to the Astral Plane; bodies remain behind. Cords link you to your forms; severing/banishment has risks.`,
      tags: ["planar","travel","high-level"]
    },
    {
      title: "Augury",
      level: 2, school: "Divination (ritual)",
      casting_time: "1 minute",
      range: "Self",
      components: "V,S,M",
      duration: "Instantaneous",
      concentration: false,
      classes: ["Cleric"],
      body: `Receive an omen on a specific course of action within ~30 minutes: good, bad, both, or unclear.`,
      tags: ["ritual","oracle","downtime"]
    },
    {
      title: "Awaken",
      level: 5, school: "Transmutation",
      casting_time: "8 hours",
      range: "Touch",
      components: "V,S,M (costly)",
      duration: "Instantaneous (plus charm)",
      concentration: false,
      classes: ["Bard","Druid"],
      body: `Grant a beast or plant intelligence and speech; it is friendly to you for a time, then acts independently.`,
      tags: ["social","minion","downtime","nature"]
    },
    // ===== B =====
    {
    title: "Bane",
    level: 1, school: "Enchantment",
    casting_time: "1 action",
    range: "30 ft",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Bard","Cleric"],
    body: `Up to three creatures make a Cha save; on a fail they subtract a small die from attack rolls and saving throws while the spell lasts.`,
    tags: ["debuff","attack penalty","save"]
  },
  {
    title: "Banishment",
    level: 4, school: "Abjuration",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Cleric","Paladin","Sorcerer","Warlock","Wizard","Artificer"],
    body: `Cha save or the target is sent away. Natives of another plane are returned there; if you maintain the spell for the full duration on such a target, it stays gone.`,
    tags: ["control","single-target","save-or-remove","planar"]
  },
  {
    title: "Barkskin",
    level: 2, school: "Transmutation",
    casting_time: "1 action",
    range: "Touch",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Druid","Ranger"],
    body: `Target’s AC can’t drop below a set floor regardless of armor, shield, or natural armor.`,
    tags: ["defense","buff","ac"]
  },
  {
    title: "Beacon of Hope",
    level: 3, school: "Abjuration",
    casting_time: "1 action",
    range: "30 ft",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Cleric"],
    body: `You bless chosen creatures: advantage on Wis saves and death saves; any healing they receive during the spell restores maximum possible on the dice.`,
    tags: ["healing boost","defense","party"]
  },
  {
    title: "Bestow Curse",
    level: 3, school: "Necromancy",
    casting_time: "1 action",
    range: "Touch",
    components: "V,S",
    duration: "Up to 1 minute (longer at higher levels)",
    concentration: true,
    classes: ["Bard","Cleric","Wizard"],
    body: `On a failed Wis save, inflict one of several curses (e.g., attack disadvantage vs you, disadvantage on chosen checks/saves, lose a turn on a failed Wis save, or take extra damage from your hits). Higher levels extend duration or remove concentration.`,
    tags: ["debuff","save","melee touch"]
  },
  {
    title: "Black Tentacles",
    level: 4, school: "Conjuration",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    aliases: ["Evard’s Black Tentacles","Evards Black Tentacles"],
    classes: ["Wizard"],
    body: `A 20-ft square becomes writhing tentacles. Creatures entering or starting there save or become restrained and take bludgeoning damage; they take more each turn they remain.`,
    tags: ["area control","restraint","ongoing damage","zone"]
  },
  {
    title: "Blade Barrier",
    level: 6, school: "Evocation",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S",
    duration: "Up to 10 minutes",
    concentration: true,
    classes: ["Cleric"],
    body: `Create a wall of whirling blades. The wall is difficult terrain; creatures that enter it for the first time on a turn or start their turn there take slashing damage (Dex save for half).`,
    tags: ["wall","area control","damage","zone"]
  },
  {
    title: "Bless",
    level: 1, school: "Enchantment",
    casting_time: "1 action",
    range: "30 ft",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Cleric","Paladin"],
    body: `Up to three creatures add a small die to attack rolls and saving throws while you maintain the spell.`,
    tags: ["buff","attack bonus","save bonus","party"]
  },
  {
    title: "Blight",
    level: 4, school: "Necromancy",
    casting_time: "1 action",
    range: "30 ft",
    components: "V,S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Druid","Sorcerer","Warlock","Wizard"],
    body: `A creature makes a Con save or takes heavy necrotic damage (plants and plant creatures are especially harmed).`,
    tags: ["damage","necrotic","save"]
  },
  {
    title: "Blindness/Deafness",
    level: 2, school: "Necromancy",
    casting_time: "1 action",
    range: "30 ft",
    components: "V",
    duration: "Up to 1 minute",
    concentration: false,
    aliases: ["Blindness Deafness"],
    classes: ["Bard","Cleric","Sorcerer","Warlock","Wizard"],
    body: `Choose one creature to blind or deafen (Con save). On a fail, it suffers the condition; it can repeat the save at the end of each of its turns.`,
    tags: ["debuff","condition","no concentration","save"]
  },
  {
    title: "Blink",
    level: 3, school: "Transmutation",
    casting_time: "1 action",
    range: "Self",
    components: "V,S",
    duration: "1 minute",
    concentration: false,
    classes: ["Bard","Sorcerer","Wizard"],
    body: `At the end of each of your turns you have a chance to vanish to the Ethereal Plane, returning at the start of your next turn to a nearby space.`,
    tags: ["defense","mobility","ethereal","no concentration"]
  },
  {
    title: "Blur",
    level: 2, school: "Illusion",
    casting_time: "1 action",
    range: "Self",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Sorcerer","Wizard"],
    body: `Your form shimmers; creatures have disadvantage on attack rolls against you unless they ignore illusions or can’t see you anyway.`,
    tags: ["defense","disadvantage to hit","self-buff"]
  },
  {
    title: "Branding Smite",
    level: 2, school: "Evocation",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Paladin"],
    body: `Your next weapon hit deals extra radiant damage and makes the target shed light; if it was invisible, it becomes visible for the duration.`,
    tags: ["smite","radiant","bonus action","reveal"]
  },
  {
    title: "Burning Hands",
    level: 1, school: "Evocation",
    casting_time: "1 action",
    range: "Self (15-ft cone)",
    components: "V,S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Sorcerer","Wizard","Artificer"],
    body: `Creatures in a close cone make Dex saves for fire damage (half on success). Unattended flammables may ignite.`,
    tags: ["aoe","fire","damage","cone"]
  },
  // ===== C =====
  {
    title: "Call Lightning",
    level: 3, school: "Conjuration", concentration: true,
    casting_time: "1 action",
    range: "120 ft",
    components: "V, S",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Druid"],
    tags: ["damage","storm","outdoor boost"],
    body: `Conjure a storm cloud and call down a bolt on a point you can see. Creatures in the area make a Dex save, taking lightning damage on a failure. While the spell lasts, you can use subsequent actions to call more bolts; outdoors in stormy conditions, damage improves.`
  },
  {
    title: "Calm Emotions",
    level: 2, school: "Enchantment", concentration: true,
    casting_time: "1 action",
    range: "60 ft",
    components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Cleric"],
    tags: ["social","charm","fear"],
    body: `Suppress strong feelings in a group. Choose one: end effects causing charmed or frightened, or make targets indifferent to a chosen group or person for the duration. Ends if harmed or clearly threatened.`
  },
  {
    title: "Chain Lightning",
    level: 6, school: "Evocation",
    casting_time: "1 action",
    range: "150 ft",
    components: "V, S, M (bit of fur + amber/cry/gem)",
    duration: "Instant",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","multi-target"],
    body: `A primary lightning bolt arcs to additional targets within range. Each creature struck makes a Dex save, taking heavy lightning damage on a failure or half on a success.`
  },
  {
    title: "Charm Person",
    level: 1, school: "Enchantment",
    casting_time: "1 action",
    range: "30 ft",
    components: "V, S",
    duration: "1 hour",
    classes: ["Bard","Cleric (Trickery)","Druid (optional)","Sorcerer","Warlock","Wizard"],
    tags: ["social","charm"],
    body: `Humanoid makes a Wis save; on a failure, it regards you as a friendly acquaintance. When the spell ends, it knows it was charmed. Advantage on the save if you or allies are fighting it.`
  },
  {
    title: "Chill Touch",
    level: 0, school: "Necromancy",
    casting_time: "1 action",
    range: "120 ft",
    components: "V, S",
    duration: "1 round",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["cantrip","damage","heal-block"],
    body: `Ranged spell attack deals necrotic damage and prevents the target from regaining hit points until your next turn. If the target is undead, it has disadvantage on attack rolls against you until then.`
  },
  {
    title: "Circle of Death",
    level: 6, school: "Necromancy",
    casting_time: "1 action",
    range: "150 ft",
    components: "V, S, M (pearl powder)",
    duration: "Instant",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["damage","area"],
    body: `A necrotic wave erupts in a large sphere, forcing Con saves. On a failure, creatures take significant necrotic damage; half on a success.`
  },
  {
    title: "Clairvoyance",
    level: 3, school: "Divination", concentration: true,
    casting_time: "10 minutes",
    range: "1 mile",
    components: "V, S, M (focus worth gp)",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Bard","Cleric","Sorcerer","Wizard"],
    tags: ["scouting","sensor"],
    body: `Creates an invisible sensor at a known or described location you’ve seen or can specify. You can switch between seeing and hearing through the sensor, which can’t move.`
  },
  {
    title: "Clone",
    level: 8, school: "Necromancy",
    casting_time: "1 hour",
    range: "Touch",
    components: "V, S, M (expensive vessel + flesh)",
    duration: "Instant (special)",
    classes: ["Wizard"],
    tags: ["ritual-like","backup body","long-term"],
    body: `Grow a duplicate body in a sealed vessel. If the original dies, their soul transfers to the clone (if free and willing), which awakens with the original’s memories and personality. Requires costly materials and time to mature.`
  },
  {
    title: "Cloudkill",
    level: 5, school: "Conjuration", concentration: true,
    casting_time: "1 action",
    range: "120 ft",
    components: "V, S",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","area","control"],
    body: `Create a moving cloud of poisonous fog. Creatures starting their turn in it save vs poison damage; on a failure they take heavy damage, half on success. The cloud drifts away from you each round.`
  },
  {
    title: "Color Spray",
    level: 1, school: "Illusion",
    casting_time: "1 action",
    range: "Self (15-ft cone)",
    components: "V, S, M (powders)",
    duration: "1 round",
    classes: ["Sorcerer","Wizard"],
    tags: ["control","blind"],
    body: `Roll effect dice to determine total hit points affected; starting with the lowest HP creatures in the cone, creatures are blinded until the start of your next turn. Undead and creatures with blindsight may be unaffected by DM ruling.`
  },
  {
    title: "Command",
    level: 1, school: "Enchantment",
    casting_time: "1 action",
    range: "60 ft",
    components: "V",
    duration: "1 round",
    classes: ["Cleric","Paladin"],
    tags: ["control","one-word"],
    body: `Speak a one-word command to a creature that understands your language. On a failed Wis save, it obeys on its next turn (common options: Drop, Flee, Grovel, Halt, Approach). No effect on undead or if the command would directly harm it.`
  },
  {
    title: "Commune",
    level: 5, school: "Divination (Ritual)",
    casting_time: "1 minute",
    range: "Self",
    components: "V, S, M (incense + holy symbol)",
    duration: "1 minute",
    classes: ["Cleric"],
    tags: ["ritual","information","divine"],
    body: `Contact your deity or a divine proxy to ask up to three yes/no questions. Answers are brief truths as the deity understands them.`
  },
  {
    title: "Commune with Nature",
    level: 5, school: "Divination (Ritual)",
    casting_time: "1 minute",
    range: "Self",
    components: "V, S",
    duration: "Instant",
    classes: ["Druid","Ranger"],
    tags: ["exploration","terrain intel"],
    body: `Gain knowledge of the surrounding territory (terrain, bodies of water, prevalent creatures, powerful fey/fiends/celestials/undead, etc.) within a few miles, filtered by natural features.`
  },
  {
    title: "Comprehend Languages",
    level: 1, school: "Divination (Ritual)",
    casting_time: "1 action",
    range: "Self",
    components: "V, S, M (soot + salt)",
    duration: "1 hour",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["utility","translation"],
    body: `Understand the literal meaning of any spoken language you hear and read text you touch (slower). Doesn’t decode ciphers or secret messages.`
  },
  {
    title: "Compulsion",
    level: 4, school: "Enchantment", concentration: true,
    casting_time: "1 action",
    range: "30 ft",
    components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard"],
    tags: ["control","movement"],
    body: `Creatures of your choice must move in a direction you designate on each of their turns if they fail a Wis save. They can’t move into obviously deadly hazards and can repeat the save each round.`
  },
  {
    title: "Cone of Cold",
    level: 5, school: "Evocation",
    casting_time: "1 action",
    range: "Self (60-ft cone)",
    components: "V, S, M (crystal or glass cone)",
    duration: "Instant",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","area","cold"],
    body: `Unleash a sub-zero blast. Creatures in the cone make Con saves, taking heavy cold damage on a failure or half on success.`
  },
  {
    title: "Confusion",
    level: 4, school: "Enchantment", concentration: true,
    casting_time: "1 action",
    range: "90 ft",
    components: "V, S, M (three nutshells)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Druid","Sorcerer","Wizard"],
    tags: ["control","debuff"],
    body: `Warp minds in a large area. Affected creatures that fail Wis saves act unpredictably each round per a random behavior table; they can repeat the save at end of turns.`
  },
  {
    title: "Conjure Animals",
    level: 3, school: "Conjuration", concentration: true,
    casting_time: "1 action",
    range: "60 ft",
    components: "V, S",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Druid","Ranger"],
    tags: ["summon","allies"],
    body: `Summon fey spirits that take the form of beasts (DM chooses exact creatures). You select the quantity/CR spread. The creatures act on their own turns and obey your commands.`
  },
  {
    title: "Conjure Celestial",
    level: 7, school: "Conjuration", concentration: true,
    casting_time: "1 minute",
    range: "90 ft",
    components: "V, S",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Cleric"],
    tags: ["summon","ally","radiant"],
    body: `Call a celestial of a chosen CR to fight and act as your ally. It follows your commands and has its own initiative.`
  },
  {
    title: "Conjure Elemental",
    level: 5, school: "Conjuration", concentration: true,
    casting_time: "1 minute",
    range: "90 ft",
    components: "V, S, M (matching element)",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Druid","Wizard"],
    tags: ["summon","ally","elemental"],
    body: `Summon an elemental bound to a nearby element (fire, air, earth, water). If concentration breaks, it may become hostile.`
  },
  {
    title: "Conjure Fey",
    level: 6, school: "Conjuration", concentration: true,
    casting_time: "1 minute",
    range: "90 ft",
    components: "V, S",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Druid","Warlock (Archfey)"],
    tags: ["summon","ally","fey"],
    body: `Summon a fey creature of a chosen CR. It acts as your ally and follows your commands; on concentration loss, it may go rogue.`
  },
  {
    title: "Conjure Minor Elementals",
    level: 4, school: "Conjuration", concentration: true,
    casting_time: "1 minute",
    range: "90 ft",
    components: "V, S",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Druid","Wizard"],
    tags: ["summon","swarm"],
    body: `Summon several low-CR elementals. You choose the CR distribution; DM selects exact creatures. They act on their own turns and follow your commands.`
  },
  {
    title: "Contact Other Plane",
    level: 5, school: "Divination (Ritual)",
    casting_time: "1 minute",
    range: "Self",
    components: "V",
    duration: "1 minute",
    classes: ["Warlock","Wizard"],
    tags: ["knowledge","risk"],
    body: `Mentally contact an extraplanar entity. You ask several yes/no questions. On a failed Int save, you suffer temporary insanity; on a success, you receive reliable, terse answers.`
  },
  {
    title: "Contagion",
    level: 5, school: "Necromancy",
    casting_time: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Varies",
    classes: ["Cleric","Druid"],
    tags: ["debuff","disease"],
    body: `On a hit, the target becomes poisoned and may contract a virulent disease after failed saves over time, imposing severe penalties specific to the chosen malady.`
  },
  {
    title: "Contingency",
    level: 6, school: "Evocation",
    casting_time: "10 minutes",
    range: "Self",
    components: "V, S, M (statue worth gp)",
    duration: "10 days",
    classes: ["Wizard"],
    tags: ["automation","prep"],
    body: `Store a 5th-level-or-lower spell that targets only you to trigger automatically under a specific condition you define. Consumes costly material.`
  },
  {
    title: "Continual Flame",
    level: 2, school: "Evocation",
    casting_time: "1 action",
    range: "Touch",
    components: "V, S, M (ruby dust)",
    duration: "Permanent",
    classes: ["Cleric","Wizard"],
    tags: ["utility","light","permanent"],
    body: `Imbue an object with a flame that produces light like a torch but no heat and no fuel. The light can be covered but not quenched by normal means.`
  },
  {
    title: "Control Water",
    level: 4, school: "Transmutation", concentration: true,
    casting_time: "1 action",
    range: "300 ft",
    components: "V, S, M (drop of water/bit of wood)",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Cleric","Druid","Wizard"],
    tags: ["battlefield","environment"],
    body: `Manipulate a large volume of water: create floods, part water, redirect flow, or whirlpool. Effects persist while you concentrate.`
  },
  {
    title: "Control Weather",
    level: 8, school: "Transmutation", concentration: true,
    casting_time: "10 minutes",
    range: "Self (several miles)",
    components: "V, S, M (burning incense + bits)",
    duration: "Up to 8 hours (Concentration)",
    classes: ["Cleric","Druid","Wizard"],
    tags: ["regional","environment","long"],
    body: `Gradually change prevailing weather within a wide area, shifting temperature, wind, and precipitation step by step. Changes take time and match local climate limits.`
  },
  {
    title: "Counterspell",
    level: 3, school: "Abjuration",
    casting_time: "1 reaction (when a creature casts a spell within 60 ft)",
    range: "60 ft",
    components: "S",
    duration: "Instant",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["reaction","interruption"],
    body: `Interrupt a creature casting a spell. If the spell’s level is within your counter threshold it fails; otherwise make an ability check to stop it.`
  },
  {
    title: "Create Food and Water",
    level: 3, school: "Conjuration",
    casting_time: "1 action",
    range: "30 ft",
    components: "V, S",
    duration: "Instant",
    classes: ["Cleric","Paladin (Oath)"],
    tags: ["utility","survival"],
    body: `Conjure enough bland food and clean water to sustain several creatures for 24 hours.`
  },
  {
    title: "Create or Destroy Water",
    level: 1, school: "Transmutation",
    casting_time: "1 action",
    range: "30 ft",
    components: "V, S, M (drop of water/dust)",
    duration: "Instant",
    classes: ["Cleric","Druid"],
    tags: ["utility","environment"],
    body: `Create clean water in containers or as rain, or destroy/evaporate water in a like volume. Limited by available containers and area.`
  },
  {
    title: "Create Undead",
    level: 6, school: "Necromancy",
    casting_time: "1 minute",
    range: "10 ft",
    components: "V, S, M (onx + corpses)",
    duration: "Instant (control requires upkeep)",
    classes: ["Cleric (Death)","Warlock (Undead)","Wizard"],
    tags: ["minions","evil","control"],
    body: `Animate corpses as ghouls (or stronger at higher levels). They obey your commands while you maintain control via daily castings; otherwise they slip free.`
  },
  {
    title: "Creation",
    level: 5, school: "Illusion",
    casting_time: "1 minute",
    range: "30 ft",
    components: "V, S, M (tiny bit of material)",
    duration: "Varies by substance",
    classes: ["Sorcerer","Wizard"],
    tags: ["utility","fabrication"],
    body: `Create a nonliving, nonmagical object of vegetable/mineral matter within size limits. Duration depends on the material’s hardness—harder substances last briefly.`
  },
  {
    title: "Cure Wounds",
    level: 1, school: "Evocation",
    casting_time: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instant",
    classes: ["Bard","Cleric","Druid","Paladin","Ranger","Artificer"],
    tags: ["healing","touch"],
    body: `Touch a creature to restore hit points. The spell has no effect on constructs or undead unless a feature says otherwise.`
  },
  // ===== D =====
  {
    title: "Dancing Lights",
    level: 0, school: "Evocation", concentration: true,
    casting_time: "1 action", range: "120 ft", components: "V, S, M (phosphorus or wychwood, or glowworm)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Druid","Sorcerer","Wizard","Artificer"],
    tags: ["utility","light"],
    body: "Create up to four torch-sized lights that you can move and combine into a glowing humanoid form. Each sheds dim light in a small area."
  },
  {
    title: "Darkness",
    level: 2, school: "Evocation", concentration: true,
    casting_time: "1 action", range: "60 ft", components: "V, M (bat fur + pitch/coal)",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["control","vision","area"],
    body: "Magical darkness fills a large area; nonmagical light can’t illuminate it and darkvision can’t see through it. If cast on an object, the darkness moves with it."
  },
  {
    title: "Darkvision",
    level: 2, school: "Transmutation",
    casting_time: "1 action", range: "Touch", components: "V, S, M (dried carrot/agate)",
    duration: "8 hours",
    classes: ["Druid","Ranger","Sorcerer","Wizard","Artificer"],
    tags: ["buff","vision"],
    body: "A willing creature gains darkvision out to a moderate distance, seeing in darkness as if it were dim light (monochrome)."
  },
  {
    title: "Daylight",
    level: 3, school: "Evocation",
    casting_time: "1 action", range: "60 ft", components: "V, S",
    duration: "1 hour",
    classes: ["Cleric","Druid","Paladin","Ranger","Sorcerer"],
    tags: ["utility","light"],
    body: "A bright light radiates from a point or object, creating bright/dim light zones. It doesn’t count as sunlight unless a feature says so."
  },
  {
    title: "Death Ward",
    level: 4, school: "Abjuration",
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "8 hours",
    classes: ["Cleric","Paladin"],
    tags: ["protection","survival"],
    body: "The first time the target would drop to 0 HP, it instead drops to 1 HP; or it ends one effect that would instantly kill the target."
  },
  {
    title: "Delayed Blast Fireball",
    level: 7, school: "Evocation", concentration: true,
    casting_time: "1 action", range: "150 ft", components: "V, S, M (tiny ball of bat guano and sulfur)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","area","setup"],
    body: "A bead of fire grows in power while you concentrate. When it detonates (or if concentration ends), it explodes like a fireball with extra damage per round delayed."
  },
  {
    title: "Demiplane",
    level: 8, school: "Conjuration",
    casting_time: "1 action", range: "60 ft", components: "S",
    duration: "1 hour",
    classes: ["Warlock","Wizard"],
    tags: ["utility","space","storage"],
    body: "Create a shadowy door to a small extradimensional room. Each casting can connect to an existing room you created before."
  },
  {
    title: "Detect Good and Evil",
    level: 1, school: "Divination",
    casting_time: "1 action", range: "Self", components: "V, S",
    duration: "10 minutes",
    classes: ["Cleric","Paladin"],
    tags: ["detection","sense"],
    body: "Sense aberrations, celestials, elementals, fey, fiends, or undead within a short range, as well as consecrated/desecrated places or objects."
  },
  {
    title: "Detect Magic",
    level: 1, school: "Divination", concentration: true,
    casting_time: "1 action (ritual)", range: "Self", components: "V, S",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Bard","Cleric","Druid","Paladin","Ranger","Sorcerer","Warlock","Wizard","Artificer"],
    tags: ["detection","investigation","ritual"],
    body: "Sense the presence of magic within a short range and see faint auras around visible magical objects or creatures."
  },
  {
    title: "Detect Poison and Disease",
    level: 1, school: "Divination",
    casting_time: "1 action (ritual)", range: "Self", components: "V, S, M (yew leaf)",
    duration: "10 minutes",
    classes: ["Cleric","Druid","Paladin","Ranger"],
    tags: ["detection","survival","ritual"],
    body: "Sense the presence and location of poisons, poisonous creatures, and diseases within a short range; learn the kind of poison/disease in play."
  },
  {
    title: "Detect Thoughts",
    level: 2, school: "Divination", concentration: true,
    casting_time: "1 action", range: "Self", components: "V, S, M (copper piece)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Sorcerer","Wizard"],
    tags: ["social","investigation","mind"],
    body: "Read surface thoughts within range and, with a save-contested probe, delve deeper. Can also scan for thinking creatures."
  },
  {
    title: "Destructive Wave",
    level: 5, school: "Evocation",
    casting_time: "1 action", range: "Self (30-ft radius)", components: "V",
    duration: "Instant",
    classes: ["Paladin"],
    tags: ["damage","prone","radiant/necrotic"],
    body: "Smash the ground with divine force. Creatures of your choice in range save or take thunder plus radiant or necrotic damage and fall prone; half damage on success, no prone."
  },
  {
    title: "Dimension Door",
    level: 4, school: "Conjuration",
    casting_time: "1 action", range: "500 ft", components: "V",
    duration: "Instant",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["teleport","movement"],
    body: "Teleport yourself (and a willing creature you touch) to a location you can describe or visualize within range. Risk mishap if the spot is occupied."
  },
  {
    title: "Disguise Self",
    level: 1, school: "Illusion",
    casting_time: "1 action", range: "Self", components: "V, S",
    duration: "1 hour",
    classes: ["Bard","Sorcerer","Warlock","Wizard","Artificer"],
    tags: ["disguise","social"],
    body: "Change your appearance and outfit within your size. Physical inspection can reveal the illusion."
  },
  {
    title: "Disintegrate",
    level: 6, school: "Transmutation",
    casting_time: "1 action", range: "60 ft", components: "V, S, M (lodestone + dust)",
    duration: "Instant",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","force","save-or-chunk"],
    body: "A thin green ray forces a Dex save; on a failure, the target takes massive force damage. Creatures reduced to 0 HP are disintegrated; objects can be destroyed."
  },
  {
    title: "Dissonant Whispers",
    level: 1, school: "Enchantment",
    casting_time: "1 action", range: "60 ft", components: "V",
    duration: "Instant",
    classes: ["Bard","Warlock (some lists)"],
    tags: ["damage","control","reaction-provoker"],
    body: "On a failed Wis save, the target takes psychic damage and must immediately use its reaction to move away from you (provoking OAs)."
  },
  {
    title: "Dispel Evil and Good",
    level: 5, school: "Abjuration", concentration: true,
    casting_time: "1 action", range: "Self", components: "V, S, M (holy water/silver, iron, etc.)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Cleric","Paladin"],
    tags: ["protection","banish","melee buff"],
    body: "Your weapon attacks can end certain effects; you can attempt to send extraplanar creatures back to their home plane after a hit, or break charm/possession on a touched creature."
  },
  {
    title: "Dispel Magic",
    level: 3, school: "Abjuration",
    casting_time: "1 action", range: "120 ft", components: "V, S",
    duration: "Instant",
    classes: ["Bard","Cleric","Druid","Paladin","Ranger","Sorcerer","Warlock","Wizard","Artificer"],
    tags: ["utility","antimagic"],
    body: "Choose a creature, object, or effect; end one spell on it. Higher-level effects may require an ability check."
  },
  {
    title: "Divination",
    level: 4, school: "Divination (Ritual)",
    casting_time: "1 action", range: "Self", components: "V, S, M (incense + sacrament)",
    duration: "Instant",
    classes: ["Cleric"],
    tags: ["ritual","information","oracle"],
    body: "Ask a single question about a specific goal, event, or activity to occur within 7 days; you receive a truthful, cryptic reply."
  },
  {
    title: "Divine Favor",
    level: 1, school: "Evocation", concentration: true,
    casting_time: "1 bonus action", range: "Self", components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Paladin"],
    tags: ["buff","damage"],
    body: "Your weapon attacks deal extra radiant damage while you maintain the spell."
  },
  {
    title: "Divine Word",
    level: 7, school: "Evocation",
    casting_time: "1 bonus action", range: "30 ft", components: "V",
    duration: "Instant (plus rider)",
    classes: ["Cleric"],
    tags: ["control","banish","save-gated"],
    body: "Speak a divine utterance that harms and debilitates creatures with low current HP. Celestials, elementals, fey, and fiends can be banished on a failed save."
  },
  {
    title: "Dominate Beast",
    level: 4, school: "Enchantment", concentration: true,
    casting_time: "1 action", range: "60 ft", components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Druid","Sorcerer","Wizard"],
    tags: ["control","charm"],
    body: "Charm and control a beast on a failed Wis save. You can issue commands; direct control requires your action."
  },
  {
    title: "Dominate Monster",
    level: 8, school: "Enchantment", concentration: true,
    casting_time: "1 action", range: "60 ft", components: "V, S",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["control","charm","boss tool"],
    body: "Charm and control any creature on a failed Wis save. Advantage on the save if you or your allies are fighting it."
  },
  {
    title: "Dominate Person",
    level: 5, school: "Enchantment", concentration: true,
    casting_time: "1 action", range: "60 ft", components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Sorcerer","Wizard"],
    tags: ["control","charm","humanoid"],
    body: "Charm and control a humanoid on a failed Wis save. You can issue commands; direct control takes your action."
  },
  {
    title: "Dream",
    level: 5, school: "Illusion",
    casting_time: "1 minute", range: "Special", components: "V, S, M (handful of sand, ink, quill)",
    duration: "8 hours",
    classes: ["Bard","Warlock","Wizard"],
    tags: ["communication","infiltration","psychic"],
    body: "Shape a target’s dreams and communicate across any distance on the same plane. You can appear monstrous to inflict psychic harm if the target fails a save."
  },
  {
    title: "Druidcraft",
    level: 0, school: "Transmutation",
    casting_time: "1 action", range: "30 ft", components: "V, S",
    duration: "Instant or 1 hour (varies)",
    classes: ["Druid"],
    tags: ["utility","flavor","cantrip"],
    body: "Create small nature effects: predict the weather, make a flower bloom, light/snuff a small flame, or create a harmless sensory effect."
  },
  // ===== E =====
  {
    title: "Earthquake",
    level: 8, school: "Evocation", concentration: true,
    casting_time: "1 action", range: "500 ft", components: "V, S, M (clay slab, water, sand)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Cleric","Druid","Sorcerer"],
    tags: ["area","environment","control"],
    body: "Create a seismic tremor in a massive area. Ground becomes difficult terrain, structures may collapse, and creatures risk being knocked prone or trapped in fissures."
  },
  {
    title: "Eldritch Blast",
    level: 0, school: "Evocation",
    casting_time: "1 action", range: "120 ft", components: "V, S",
    duration: "Instant",
    classes: ["Warlock"],
    tags: ["damage","cantrip","force"],
    body: "Make a ranged spell attack dealing force damage. At higher levels you fire multiple beams that can target the same or different creatures."
  },
  {
    title: "Elemental Weapon",
    level: 3, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Paladin"],
    tags: ["buff","damage","weapon"],
    body: "Imbue a weapon with elemental power, granting a bonus to attack rolls and adding acid, cold, fire, lightning, or thunder damage to hits."
  },
  {
    title: "Enhance Ability",
    level: 2, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "Touch", components: "V, S, M (fur or feather)",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Bard","Cleric","Druid","Sorcerer"],
    tags: ["buff","ability checks"],
    body: "Grant one creature advantage on checks using a chosen ability (Strength, Dex, etc.) and often a minor physical benefit like extra carrying capacity or fall mitigation."
  },
  {
    title: "Enlarge Reduce",
    level: 2, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "30 ft", components: "V, S, M (powdered iron)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Sorcerer","Wizard"],
    tags: ["buff","debuff","size"],
    body: "Change a creature or object’s size. Enlarge doubles its dimensions and adds damage; Reduce halves its dimensions and imposes disadvantage on Strength checks and saves."
  },
  {
    title: "Ensnaring Strike",
    level: 1, school: "Conjuration", concentration: true,
    casting_time: "1 bonus action", range: "Self", components: "V",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Paladin","Ranger"],
    tags: ["damage","control","bonus action"],
    body: "Next time you hit with a weapon attack, vines spring forth to restrain the target on a failed Strength save, dealing piercing damage each turn until freed."
  },
  {
    title: "Entangle",
    level: 1, school: "Conjuration", concentration: true,
    casting_time: "1 action", range: "90 ft", components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Druid"],
    tags: ["control","area","plants"],
    body: "Grasping weeds sprout in a large square. Creatures in the area must make Strength saves or be restrained. The ground becomes difficult terrain."
  },
  {
    title: "Enthrall",
    level: 2, school: "Enchantment",
    casting_time: "1 action", range: "60 ft", components: "V, S",
    duration: "1 minute",
    classes: ["Bard","Warlock"],
    tags: ["social","charm"],
    body: "You speak compellingly, forcing nearby creatures to make Wis saves. On a failure they have disadvantage on Perception checks to notice creatures other than you."
  },
  {
    title: "Etherealness",
    level: 7, school: "Transmutation",
    casting_time: "1 action", range: "Self", components: "V, S",
    duration: "Up to 8 hours",
    classes: ["Cleric","Sorcerer","Warlock","Wizard"],
    tags: ["travel","planar"],
    body: "Shift into the Ethereal Plane, allowing you to move through objects and creatures on the Material Plane as if incorporeal. Ends when you return or the spell expires."
  },
  {
    title: "Expeditious Retreat",
    level: 1, school: "Transmutation", concentration: true,
    casting_time: "1 bonus action", range: "Self", components: "V, S",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["mobility","speed"],
    body: "Allows you to take the Dash action as a bonus action each turn, greatly increasing mobility for the duration."
  },
  {
    title: "Eyebite",
    level: 6, school: "Necromancy", concentration: true,
    casting_time: "1 action", range: "Self", components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["debuff","control"],
    body: "Your eyes become pools of dark power. Each round, choose a creature within range to sicken, sleep, or frighten on a failed Wisdom save."
  },
  // ===== F =====
  {
    title: "Fabricate",
    level: 4, school: "Transmutation",
    casting_time: "10 minutes", range: "120 ft", components: "V, S",
    duration: "Instant",
    classes: ["Artificer","Wizard"],
    tags: ["crafting","utility"],
    body: "Convert raw materials into a finished item of the same material. You can’t create magic items or intricate works without proper tools and skill."
  },
  {
    title: "Faerie Fire",
    level: 1, school: "Evocation", concentration: true,
    casting_time: "1 action", range: "60 ft", components: "V",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Druid"],
    tags: ["control","illumination"],
    body: "Creatures in a 20-ft cube outlined in glowing light must make a Dex save or shed dim light, granting advantage on attacks against them and negating invisibility."
  },
  {
    title: "Faithful Hound",
    level: 4, school: "Conjuration",
    casting_time: "1 action", range: "30 ft", components: "V, S, M (silver whistle, bone)",
    duration: "8 hours",
    classes: ["Wizard"],
    tags: ["utility","guardian"],
    body: "Conjure a spectral hound that remains invisible until triggered. It attacks intruders within 30 ft and barks loudly to alert you."
  },
  {
    title: "False Life",
    level: 1, school: "Necromancy",
    casting_time: "1 action", range: "Self", components: "V, S, M (drop of alcohol or distilled spirits)",
    duration: "1 hour",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["defense","temporary HP"],
    body: "Bolster yourself with necromantic energy, gaining temporary hit points for the duration."
  },
  {
    title: "Fear",
    level: 3, school: "Illusion", concentration: true,
    casting_time: "1 action", range: "Self (30-ft cone)", components: "V, S, M (white feather or heart of a hen)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["control","frighten"],
    body: "Each creature in a cone that fails a Wis save drops what it’s holding and flees while frightened until it can no longer see you."
  },
  {
    title: "Feather Fall",
    level: 1, school: "Transmutation", casting_time: "1 reaction (when a creature falls)",
    range: "60 ft", components: "V, M (small feather or down)",
    duration: "1 minute",
    classes: ["Bard","Sorcerer","Wizard"],
    tags: ["reaction","falling"],
    body: "Up to five falling creatures slow to 60 ft per round and take no damage on landing."
  },
  {
    title: "Feeblemind",
    level: 8, school: "Enchantment",
    casting_time: "1 action", range: "150 ft", components: "V, S, M (handful of clay, crystal, or glass)",
    duration: "Instant (long-term)",
    classes: ["Bard","Druid","Warlock","Wizard"],
    tags: ["debuff","mental"],
    body: "Target creature takes psychic damage and must save or have its Int and Cha drop to 1. It can’t cast spells or understand language until cured by greater restoration or wish."
  },
  {
    title: "Feign Death",
    level: 3, school: "Necromancy (Ritual)",
    casting_time: "1 action", range: "Touch", components: "V, S, M (pinch of grave dirt)",
    duration: "1 hour",
    classes: ["Bard","Cleric","Druid","Wizard"],
    tags: ["ritual","utility"],
    body: "Put a willing creature into a deathlike state. It appears dead to all inspection but remains conscious and aware."
  },
  {
    title: "Find Familiar",
    level: 1, school: "Conjuration (Ritual)",
    casting_time: "1 hour", range: "10 ft", components: "V, S, M (charcoal, incense, herbs worth 10 gp)",
    duration: "Instant (until dismissed)",
    classes: ["Wizard"],
    tags: ["summon","utility"],
    body: "Summon a familiar spirit in animal form. Acts independently but obeys commands, can deliver touch spells, and be temporarily dismissed into a pocket dimension."
  },
  {
    title: "Find Steed",
    level: 2, school: "Conjuration",
    casting_time: "10 minutes", range: "30 ft", components: "V, S",
    duration: "Instant (until dismissed)",
    classes: ["Paladin"],
    tags: ["summon","mount"],
    body: "Summon a spirit steed that serves as a loyal mount, sharing your telepathic link and benefiting from your spells that target yourself."
  },
  {
    title: "Find the Path",
    level: 6, school: "Divination", concentration: true,
    casting_time: "1 minute", range: "Self", components: "V, S, M (divination tool worth 100 gp)",
    duration: "Up to 1 day (Concentration)",
    classes: ["Bard","Cleric","Druid"],
    tags: ["navigation","exploration"],
    body: "Know the shortest and most direct physical route to a specific fixed location familiar to you."
  },
  {
    title: "Find Traps",
    level: 2, school: "Divination",
    casting_time: "1 action", range: "120 ft", components: "V, S",
    duration: "Instant",
    classes: ["Cleric","Druid","Ranger"],
    tags: ["detection","utility"],
    body: "Sense the presence of any traps within line of sight. Reveals a trap’s nature but not its location or how to disarm it."
  },
  {
    title: "Finger of Death",
    level: 7, school: "Necromancy",
    casting_time: "1 action", range: "60 ft", components: "V, S",
    duration: "Instant",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["damage","necrotic"],
    body: "Target makes a Con save or takes massive necrotic damage (half on success). Humanoids slain by it rise as your zombie on the next turn."
  },
  {
    title: "Fire Bolt",
    level: 0, school: "Evocation",
    casting_time: "1 action", range: "120 ft", components: "V, S",
    duration: "Instant",
    classes: ["Sorcerer","Wizard","Artificer"],
    tags: ["damage","cantrip","fire"],
    body: "Make a ranged spell attack that deals fire damage to a creature or flammable object."
  },
  {
    title: "Fire Shield",
    level: 4, school: "Evocation",
    casting_time: "1 action", range: "Self", components: "V, S, M (bit of phosphor or firefly)",
    duration: "10 minutes",
    classes: ["Sorcerer","Wizard"],
    tags: ["defense","damage","elemental"],
    body: "Wreathe yourself in flame. Choose warm or chill shield: attackers that hit you take fire or cold damage; you gain resistance to the opposite type."
  },
  {
    title: "Fire Storm",
    level: 7, school: "Evocation",
    casting_time: "1 action", range: "150 ft", components: "V, S",
    duration: "Instant",
    classes: ["Cleric","Druid","Sorcerer"],
    tags: ["damage","area","fire"],
    body: "Fill a massive area with roaring flames in a shape you choose. Creatures make Dex saves for half damage; vegetation may ignite."
  },
  {
    title: "Fireball",
    level: 3, school: "Evocation",
    casting_time: "1 action", range: "150 ft", components: "V, S, M (tiny ball of bat guano and sulfur)",
    duration: "Instant",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","area","fire"],
    body: "A classic explosive spell—point of origin within range erupts in fire; creatures make Dex saves for half damage."
  },
  {
    title: "Flame Blade",
    level: 2, school: "Evocation", concentration: true,
    casting_time: "1 bonus action", range: "Self", components: "V, S, M (leaf of sumac)",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Druid"],
    tags: ["damage","melee","fire"],
    body: "Create a fiery scimitar that deals fire damage on melee spell attacks and sheds light."
  },
  {
    title: "Flame Strike",
    level: 5, school: "Evocation",
    casting_time: "1 action", range: "60 ft", components: "V, S, M (pinch of sulfur)",
    duration: "Instant",
    classes: ["Cleric"],
    tags: ["damage","radiant","fire"],
    body: "A vertical column of divine fire scorches a cylinder area. On a failed Dex save, creatures take half fire and half radiant damage."
  },
  {
    title: "Flaming Sphere",
    level: 2, school: "Conjuration", concentration: true,
    casting_time: "1 action", range: "60 ft", components: "V, S, M (tallow, brimstone, iron)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Druid","Wizard"],
    tags: ["damage","control","fire"],
    body: "Create a 5-ft diameter flaming sphere you can move as a bonus action. It damages creatures ending their turn adjacent to it."
  },
  {
    title: "Flesh to Stone",
    level: 6, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "60 ft", components: "V, S, M (clay of same type as target)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["debuff","petrify"],
    body: "Target makes Con saves each round or becomes restrained as its flesh hardens; on multiple failed saves, the creature turns to stone."
  },
  {
    title: "Floating Disk",
    level: 1, school: "Conjuration (Ritual)",
    casting_time: "1 action", range: "30 ft", components: "V, S, M (drop of mercury)",
    duration: "1 hour",
    classes: ["Wizard"],
    tags: ["utility","carry"],
    body: "Conjure a 3-ft diameter disk of force that floats 3 ft above the ground and follows you, carrying up to 500 lb."
  },
  {
    title: "Fly",
    level: 3, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "Touch", components: "V, S, M (wing feather)",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["mobility","flight"],
    body: "A willing creature gains a flying speed of 60 ft for the duration. Additional creatures can be affected at higher levels."
  },
  {
    title: "Fog Cloud",
    level: 1, school: "Conjuration", concentration: true,
    casting_time: "1 action", range: "120 ft", components: "V, S",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Druid","Ranger","Sorcerer","Wizard"],
    tags: ["control","obscurement"],
    body: "A sphere of fog spreads from a point, heavily obscuring the area. Wind disperses it early."
  },
  {
    title: "Forbiddance",
    level: 6, school: "Abjuration", casting_time: "10 minutes",
    range: "Touch", components: "V, S, M (holy water, incense, ruby dust worth 1,000 gp)",
    duration: "24 hours (renewable)",
    classes: ["Cleric"],
    tags: ["warding","planar","holy"],
    body: "Wards an area against planar travel and certain creature types. Intruders take damage of a type you choose; can be made permanent by daily castings."
  },
  {
    title: "Forcecage",
    level: 7, school: "Evocation",
    casting_time: "1 action", range: "100 ft", components: "V, S, M (ruby dust worth 1,500 gp)",
    duration: "1 hour",
    classes: ["Warlock","Wizard"],
    tags: ["control","imprisonment"],
    body: "Create a cage or box of magical force that no creature can leave by physical or magical means unless teleporting via wish or similar power."
  },
  {
    title: "Foresight",
    level: 9, school: "Divination",
    casting_time: "1 minute", range: "Touch", components: "V, S, M (hummingbird feather)",
    duration: "8 hours",
    classes: ["Bard","Druid","Warlock","Wizard"],
    tags: ["buff","premonition"],
    body: "Grant a willing creature uncanny foresight. They can’t be surprised, have advantage on attack rolls, ability checks, and saves, and enemies have disadvantage to hit them."
  },
  {
    title: "Freedom of Movement",
    level: 4, school: "Abjuration",
    casting_time: "1 action", range: "Touch", components: "V, S, M (leather strap)",
    duration: "1 hour",
    classes: ["Bard","Cleric","Druid","Paladin","Ranger"],
    tags: ["buff","mobility","defense"],
    body: "Target is unaffected by difficult terrain and magical restraints, and can escape nonmagical bindings automatically."
  },
  {
    title: "Freezing Sphere",
    level: 6, school: "Evocation",
    casting_time: "1 action", range: "300 ft", components: "V, S, M (tiny crystal sphere)",
    duration: "Instant",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","cold","area"],
    body: "Hurl a sphere of cold that explodes in a large radius, dealing cold damage to creatures and freezing water. You can instead throw the sphere as a delayed ice grenade."
  },
  // ===== G =====
  {
    title: "Gaseous Form",
    level: 3, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "Touch", components: "V, S, M (bit of gauze and smoke)",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["utility","defense","movement"],
    body: "A willing creature becomes a misty cloud, gaining resistance to nonmagical damage, immunity to being grappled, and the ability to move through cracks and small openings."
  },
  {
    title: "Gate",
    level: 9, school: "Conjuration",
    casting_time: "1 action", range: "60 ft", components: "V, S, M (diamond worth 5,000 gp)",
    duration: "Concentration, up to 1 minute",
    classes: ["Cleric","Sorcerer","Wizard"],
    tags: ["planar","summon","teleportation"],
    body: "Open a portal linking your plane to another. You can travel instantly between the two or call a specific creature’s true name to bring it through—potentially hostile or unwilling."
  },
  {
    title: "Geas",
    level: 5, school: "Enchantment",
    casting_time: "1 minute", range: "60 ft", components: "V",
    duration: "30 days",
    classes: ["Bard","Cleric","Druid","Paladin","Wizard"],
    tags: ["control","charm","long-term"],
    body: "Command a creature to perform or avoid a specific action. On a failed Wis save, it must obey or take psychic damage each day it disobeys. Breakable only by powerful magic."
  },
  {
    title: "Gentle Repose",
    level: 2, school: "Necromancy (Ritual)",
    casting_time: "1 action", range: "Touch", components: "V, S, M (salt and copper piece on each eye)",
    duration: "10 days",
    classes: ["Cleric","Wizard"],
    tags: ["ritual","corpse","preservation"],
    body: "Protect a corpse from decay and prevent it from becoming undead. Also pauses time limits for resurrection spells."
  },
  {
    title: "Giant Insect",
    level: 4, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "30 ft", components: "V, S",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Druid"],
    tags: ["summon","beasts"],
    body: "Transform up to ten centipedes, spiders, wasps, or scorpions into giant versions that obey your verbal commands."
  },
  {
    title: "Glibness",
    level: 8, school: "Transmutation",
    casting_time: "1 action", range: "Self", components: "V",
    duration: "1 hour",
    classes: ["Bard","Warlock"],
    tags: ["social","deception"],
    body: "For the duration, any Charisma (Deception or Persuasion) check you make is treated as a 15 if lower, and magic cannot detect that you are lying."
  },
  {
    title: "Globe of Invulnerability",
    level: 6, school: "Abjuration", concentration: true,
    casting_time: "1 action", range: "Self (10-ft radius)", components: "V, S, M (glass or crystal bead)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Sorcerer","Wizard"],
    tags: ["defense","antimagic"],
    body: "A shimmering barrier surrounds you, blocking spells of 5th level or lower from passing through or affecting anything inside. Higher-level versions protect against stronger magic."
  },
  {
    title: "Glyph of Warding",
    level: 3, school: "Abjuration",
    casting_time: "1 hour", range: "Touch", components: "V, S, M (incense + powdered diamond worth 200 gp)",
    duration: "Until dispelled or triggered",
    classes: ["Bard","Cleric","Wizard"],
    tags: ["trap","ward","explosive"],
    body: "Inscribe a magical glyph that triggers when conditions are met, releasing a stored spell or explosion. Commonly used for traps or sanctums."
  },
  {
    title: "Goodberry",
    level: 1, school: "Transmutation",
    casting_time: "1 action", range: "Touch", components: "V, S, M (sprig of mistletoe)",
    duration: "Instant",
    classes: ["Druid","Ranger"],
    tags: ["healing","food","survival"],
    body: "Up to ten berries appear, each restoring 1 HP when eaten and providing nourishment for one day. Lasts 24 hours before spoiling."
  },
  {
    title: "Grease",
    level: 1, school: "Conjuration",
    casting_time: "1 action", range: "60 ft", components: "V, S, M (bit of pork rind or butter)",
    duration: "1 minute",
    classes: ["Wizard"],
    tags: ["control","prone","area"],
    body: "A slick grease covers a 10-ft square, turning it into difficult terrain. Creatures entering or starting their turn there must save or fall prone."
  },
  {
    title: "Greater Invisibility",
    level: 4, school: "Illusion", concentration: true,
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Sorcerer","Wizard"],
    tags: ["buff","stealth"],
    body: "A creature you touch becomes completely invisible until the spell ends, along with everything it’s wearing or carrying."
  },
  {
    title: "Greater Restoration",
    level: 5, school: "Abjuration",
    casting_time: "1 action", range: "Touch", components: "V, S, M (diamond dust worth 100 gp)",
    duration: "Instant",
    classes: ["Bard","Cleric","Druid"],
    tags: ["healing","cure","restoration"],
    body: "Removes one debilitating effect from a creature: exhaustion level, charm, petrification, curse, ability score reduction, or max HP reduction."
  },
  {
    title: "Guardian of Faith",
    level: 4, school: "Conjuration",
    casting_time: "1 action", range: "30 ft", components: "V",
    duration: "8 hours",
    classes: ["Cleric"],
    tags: ["defense","guardian"],
    body: "Summon a large spectral guardian that occupies a space and damages hostile creatures within 10 ft. It disappears after dealing a set amount of damage."
  },
  {
    title: "Guards and Wards",
    level: 6, school: "Abjuration",
    casting_time: "10 minutes", range: "Touch", components: "V, S, M (burning incense, a small silver rod, etc.)",
    duration: "24 hours",
    classes: ["Bard","Wizard"],
    tags: ["ward","area protection"],
    body: "Wards a building with magical effects—fog, locked doors, webs, confusion, or other hindrances. Effects persist for the duration and can be renewed."
  },
  {
    title: "Guidance",
    level: 0, school: "Divination", concentration: true,
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Cleric","Druid"],
    tags: ["cantrip","buff"],
    body: "Touch a willing creature, granting it a +1d4 bonus to one ability check of its choice before the roll ends."
  },
  {
    title: "Guiding Bolt",
    level: 1, school: "Evocation",
    casting_time: "1 action", range: "120 ft", components: "V, S",
    duration: "1 round",
    classes: ["Cleric"],
    tags: ["damage","radiant","support"],
    body: "Make a ranged spell attack that deals radiant damage. The next attack roll made against the target before your next turn has advantage due to glowing light."
  },
  {
    title: "Gust of Wind",
    level: 2, school: "Evocation", concentration: true,
    casting_time: "1 action", range: "Self (60-ft line)", components: "V, S, M (bean)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Druid","Sorcerer","Wizard"],
    tags: ["control","movement","environment"],
    body: "A line of strong wind blasts from you, pushing creatures back, extinguishing flames, and dispersing gases or vapors."
  },
  // ===== H =====
  {
    title: "Hallow",
    level: 5, school: "Evocation",
    casting_time: "24 hours", range: "Touch", components: "V, S, M (herbs, oils, and incense worth 1,000 gp)",
    duration: "Until dispelled",
    classes: ["Cleric"],
    tags: ["ward","holy","area"],
    body: "You infuse an area with holy or unholy power. Celestials, fiends, and undead suffer penalties there. You can link a secondary effect such as fear, courage, or an energy barrier."
  },
  {
    title: "Hallucinatory Terrain",
    level: 4, school: "Illusion",
    casting_time: "10 minutes", range: "300 ft", components: "V, S, M (twig, soil, stone, and water)",
    duration: "24 hours",
    classes: ["Bard","Druid","Wizard"],
    tags: ["illusion","terrain","exploration"],
    body: "Make natural terrain look, sound, and smell like something else—forest becomes meadow, hill becomes ravine, etc. The illusion is purely sensory and fails under physical inspection."
  },
  {
    title: "Harm",
    level: 6, school: "Necromancy",
    casting_time: "1 action", range: "60 ft", components: "V, S",
    duration: "Instant",
    classes: ["Cleric"],
    tags: ["damage","debuff","necrotic"],
    body: "Inflict massive necrotic damage on a creature. On a failed Con save it also has its maximum hit points reduced for the duration."
  },
  {
    title: "Haste",
    level: 3, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "30 ft", components: "V, S, M (shaving of licorice root)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Sorcerer","Wizard"],
    tags: ["buff","speed","offense"],
    body: "Double a creature’s speed, give +2 AC, advantage on Dex saves, and an extra action each turn. When the spell ends, the target loses its next turn as it slows."
  },
  {
    title: "Heal",
    level: 6, school: "Evocation",
    casting_time: "1 action", range: "60 ft", components: "V, S",
    duration: "Instant",
    classes: ["Cleric","Druid"],
    tags: ["healing","restoration"],
    body: "Channel divine energy to restore a large number of hit points, cure blindness, deafness, and most diseases instantly."
  },
  {
    title: "Healing Word",
    level: 1, school: "Evocation",
    casting_time: "1 bonus action", range: "60 ft", components: "V",
    duration: "Instant",
    classes: ["Bard","Cleric","Druid"],
    tags: ["healing","bonus action","ranged"],
    body: "A quick verbal prayer heals an ally within range for a small amount. You can’t cast another leveled spell in the same turn except a cantrip."
  },
  {
    title: "Heat Metal",
    level: 2, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "60 ft", components: "V, S, M (small iron piece)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Druid"],
    tags: ["damage","control","fire"],
    body: "Cause metal objects to glow red hot. The bearer takes fire damage each round and may drop or remove the item to avoid continued burns."
  },
  {
    title: "Hellish Rebuke",
    level: 1, school: "Evocation",
    casting_time: "1 reaction (when you take damage)", range: "60 ft", components: "V, S",
    duration: "Instant",
    classes: ["Warlock"],
    tags: ["reaction","damage","fire"],
    body: "Point at your attacker and engulf them in flames. They make a Dex save for half damage. Damage increases with higher slots."
  },
  {
    title: "Heroes' Feast",
    level: 6, school: "Conjuration",
    casting_time: "10 minutes", range: "30 ft", components: "V, S, M (bowl worth 1,000 gp)",
    duration: "Instant (effects last 24 hours)",
    classes: ["Cleric","Druid"],
    tags: ["buff","feast","healing"],
    body: "Summon a magnificent feast that cures diseases and poisons, grants immunity to fear, and increases HP maximum for one day."
  },
  {
    title: "Heroism",
    level: 1, school: "Enchantment", concentration: true,
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Paladin"],
    tags: ["buff","fear immunity","temporary HP"],
    body: "Imbue courage in a willing creature, preventing fear and granting temporary HP each round."
  },
  {
    title: "Hideous Laughter",
    level: 1, school: "Enchantment", concentration: true,
    casting_time: "1 action", range: "30 ft", components: "V, S, M (tiny tart + feather)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Wizard"],
    tags: ["control","debuff","prone"],
    body: "A creature falls into uncontrollable laughter on a failed Wis save, becoming prone and incapacitated. It can repeat the save when damaged or each turn."
  },
  {
    title: "Hold Monster",
    level: 5, school: "Enchantment", concentration: true,
    casting_time: "1 action", range: "90 ft", components: "V, S, M (small iron piece)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Cleric","Sorcerer","Warlock","Wizard"],
    tags: ["control","paralyze"],
    body: "Paralyze any creature (not just humanoids) that fails a Wis save. Paralyzed targets can be critically hit by attacks from within 5 ft."
  },
  {
    title: "Hold Person",
    level: 2, school: "Enchantment", concentration: true,
    casting_time: "1 action", range: "60 ft", components: "V, S, M (small iron piece)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Cleric","Druid","Sorcerer","Warlock","Wizard"],
    tags: ["control","paralyze","humanoid"],
    body: "Choose a humanoid within range; on a failed Wis save it becomes paralyzed. You can affect more targets at higher levels."
  },
  {
    title: "Holy Aura",
    level: 8, school: "Abjuration", concentration: true,
    casting_time: "1 action", range: "Self (30-ft radius)", components: "V, S, M (tiny reliquary worth 1,000 gp)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Cleric"],
    tags: ["buff","protection","radiant"],
    body: "Allies in the aura gain advantage on saves and impose disadvantage on attack rolls against them. Fiends and undead that hit an ally take radiant damage."
  },
  {
    title: "Hunter's Mark",
    level: 1, school: "Divination", concentration: true,
    casting_time: "1 bonus action", range: "90 ft", components: "V",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Ranger"],
    tags: ["damage","tracking","bonus action"],
    body: "Mark a target as your quarry. You deal extra weapon damage to it and gain advantage on Perception and Survival checks to find it."
  },
  {
    title: "Hypnotic Pattern",
    level: 3, school: "Illusion", concentration: true,
    casting_time: "1 action", range: "120 ft", components: "S, M (glowing stick of incense or crystal vial)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["control","charm","area"],
    body: "Create twisting lights that charm and incapacitate creatures in a large cube. They remain motionless until shaken or damaged."
  },
  // ===== J =====
  {
    title: "Jump",
    level: 1, school: "Transmutation",
    casting_time: "1 action", range: "Touch", components: "V, S, M (grasshopper’s hind leg)",
    duration: "1 minute",
    classes: ["Druid","Ranger","Sorcerer","Wizard","Artificer"],
    tags: ["mobility","buff"],
    body: "Touch a willing creature to triple its jump distance for the duration. Can combine with other effects like haste or step of the wind for extreme leaps."
  },
  // ===== K =====
  {
    title: "Knock",
    level: 2, school: "Transmutation",
    casting_time: "1 action", range: "60 feet", components: "V",
    duration: "Instantaneous",
    classes: ["Bard","Sorcerer","Wizard","Artificer"],
    tags: ["utility"],
    body: "Choose an object you can see within range—such as a door, chest, or set of manacles—that is locked, stuck, or barred. It is unlocked, unstuck, or unbarred. A loud knock, audible from up to 300 feet away, accompanies the effect."
  },
  // ===== L =====
  {
    title: "Legend Lore",
    level: 5, school: "Divination",
    casting_time: "10 minutes", range: "Self", components: "V, S, M (incense worth 250 gp and four ivory strips worth 50 gp each, consumed)",
    duration: "Instantaneous",
    classes: ["Bard","Cleric","Wizard"],
    tags: ["information"],
    body: "Name or describe a person, place, or object. You gain a brief summary of its significant lore—its history, legends, or notable deeds—accurate but possibly limited or cryptic."
  },
  {
    title: "Lesser Restoration",
    level: 2, school: "Abjuration",
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "Instantaneous",
    classes: ["Bard","Cleric","Druid","Paladin","Ranger","Artificer"],
    tags: ["healing","utility"],
    body: "Touch a creature to end one disease or one condition afflicting it. Possible conditions include blindness, deafness, paralysis, or poison."
  },
  {
    title: "Levitate",
    level: 2, school: "Transmutation",
    casting_time: "1 action", range: "60 feet", components: "V, S, M (small leather loop)",
    duration: "Concentration, up to 10 minutes",
    classes: ["Sorcerer","Wizard","Artificer"],
    tags: ["mobility","control"],
    body: "One creature or object rises vertically up to 20 feet and remains suspended. You can move the target up or down as part of your action. If the effect ends and the target is aloft, it falls."
  },
  {
    title: "Light",
    level: 0, school: "Evocation (Cantrip)",
    casting_time: "1 action", range: "Touch", components: "V, M (firefly or phosphorescent moss)",
    duration: "1 hour",
    classes: ["Bard","Cleric","Sorcerer","Wizard"],
    tags: ["utility","illumination"],
    body: "You touch one object no larger than 10 feet in any dimension. It sheds bright light in a 20-foot radius and dim light for an additional 20 feet. Covering the object completely blocks the light."
  },
  {
    title: "Lightning Bolt",
    level: 3, school: "Evocation",
    casting_time: "1 action", range: "Self (100-foot line)", components: "V, S, M (bit of fur and amber, crystal, or glass)",
    duration: "Instantaneous",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","area"],
    body: "A bolt of lightning forms a 100-foot-long, 5-foot-wide line. Each creature in the line makes a Dexterity saving throw, taking 8d6 lightning damage on a failed save or half as much on a success."
  },
  {
    title: "Locate Animals or Plants",
    level: 2, school: "Divination",
    casting_time: "1 action", range: "Self", components: "V, S, M (bit of fur from a bloodhound)",
    duration: "Instantaneous",
    classes: ["Bard","Druid","Ranger"],
    tags: ["detection","nature"],
    body: "Describe or name a specific kind of beast or plant. You sense the nearest of that type within 5 miles if any are present."
  },
  {
    title: "Locate Creature",
    level: 4, school: "Divination",
    casting_time: "1 action", range: "Self", components: "V, S, M (bit of fur from a bloodhound)",
    duration: "Concentration, up to 1 hour",
    classes: ["Bard","Cleric","Druid","Paladin","Ranger","Wizard"],
    tags: ["detection"],
    body: "Describe or name a creature familiar to you. You sense its direction and distance within 1,000 feet, provided it isn’t blocked by running water or lead."
  },
  {
    title: "Locate Object",
    level: 2, school: "Divination",
    casting_time: "1 action", range: "Self", components: "V, S, M (forked twig)",
    duration: "Concentration, up to 10 minutes",
    classes: ["Bard","Cleric","Druid","Paladin","Ranger","Wizard"],
    tags: ["detection"],
    body: "Describe or name an object familiar to you. You sense its direction within 1,000 feet if it isn’t blocked by thin lead or running water."
  },
  {
    title: "Longstrider",
    level: 1, school: "Transmutation",
    casting_time: "1 action", range: "Touch", components: "V, S, M (drop of oil)",
    duration: "1 hour",
    classes: ["Bard","Druid","Ranger","Wizard","Artificer"],
    tags: ["mobility","buff"],
    body: "Touch a creature to increase its speed by 10 feet for the duration. The effect is not concentration and can stack with other speed bonuses."
  },
  // ===== M =====
  {
    title: "Mage Armor",
    level: 1, school: "Abjuration",
    casting_time: "1 action", range: "Touch", components: "V, S, M (piece of cured leather)",
    duration: "8 hours",
    classes: ["Sorcerer","Wizard","Artificer"],
    tags: ["defense","buff"],
    body: "Touch an unarmored creature to surround it with a protective magical field. The target’s base AC becomes 13 + its Dexterity modifier until the spell ends."
  },
  {
    title: "Mage Hand",
    level: 0, school: "Conjuration (Cantrip)",
    casting_time: "1 action", range: "30 feet", components: "V, S",
    duration: "1 minute",
    classes: ["Bard","Sorcerer","Warlock","Wizard","Artificer"],
    tags: ["utility"],
    body: "Create a spectral, floating hand that can manipulate objects, open doors, or carry up to 10 pounds. It can’t attack or activate magical items."
  },
  {
    title: "Magic Circle",
    level: 3, school: "Abjuration",
    casting_time: "1 minute", range: "10 feet", components: "V, S, M (holy water or powdered silver and iron worth 100 gp, consumed)",
    duration: "1 hour",
    classes: ["Cleric","Paladin","Warlock","Wizard"],
    tags: ["defense","banishment"],
    body: "You inscribe a circle that prevents creatures of a chosen type (celestial, elemental, fey, fiend, undead) from entering or teleporting out. You can also reverse it to trap such a creature inside."
  },
  {
    title: "Magic Jar",
    level: 6, school: "Necromancy",
    casting_time: "1 minute", range: "Self", components: "V, S, M (gem or crystal worth at least 500 gp)",
    duration: "Until dispelled",
    classes: ["Wizard"],
    tags: ["possession","utility"],
    body: "Your soul enters the container, leaving your body unconscious. You can attempt to possess humanoids within 100 feet. If the host dies, your soul returns to the jar if intact."
  },
  {
    title: "Magic Missile",
    level: 1, school: "Evocation",
    casting_time: "1 action", range: "120 feet", components: "V, S",
    duration: "Instantaneous",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","force"],
    body: "Create three glowing darts of magical force that automatically hit and deal 1d4 + 1 force damage each. Higher-level casting adds one dart per slot above 1st."
  },
  {
    title: "Magic Mouth",
    level: 2, school: "Illusion",
    casting_time: "1 minute", range: "30 feet", components: "V, S, M (bit of honeycomb and jade dust worth 10 gp)",
    duration: "Until dispelled",
    classes: ["Bard","Wizard"],
    tags: ["utility","warding"],
    body: "You enchant an object to speak a recorded message when specific conditions are met, such as a phrase being spoken or a creature entering an area."
  },
  {
    title: "Magic Weapon",
    level: 2, school: "Transmutation",
    casting_time: "1 bonus action", range: "Touch", components: "V, S",
    duration: "Concentration, up to 1 hour",
    classes: ["Paladin","Wizard","Artificer"],
    tags: ["buff"],
    body: "Touch a nonmagical weapon to make it a +1 magical weapon. When cast using a 4th-level slot, it becomes +2; at 6th level, +3."
  },
  {
    title: "Magnificent Mansion",
    level: 7, school: "Conjuration",
    casting_time: "1 minute", range: "300 feet", components: "V, S, M (miniature door carved from ivory and gem worth 5 gp)",
    duration: "24 hours",
    classes: ["Bard","Wizard"],
    tags: ["utility","sanctuary"],
    body: "Conjure a luxurious extradimensional mansion that serves as safe lodging. It contains food, servants, and rooms of your design, accessible through a magical doorway."
  },
  {
    title: "Major Image",
    level: 3, school: "Illusion",
    casting_time: "1 action", range: "120 feet", components: "V, S, M (bit of fleece)",
    duration: "Concentration, up to 10 minutes",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["illusion","utility"],
    body: "Create a realistic image with sound, smell, and temperature. Interacting with it can reveal the illusion with an Intelligence (Investigation) check."
  },
  {
    title: "Mass Cure Wounds",
    level: 5, school: "Evocation",
    casting_time: "1 action", range: "60 feet", components: "V, S",
    duration: "Instantaneous",
    classes: ["Bard","Cleric","Druid"],
    tags: ["healing","area"],
    body: "Choose up to six creatures in a 30-foot radius sphere. Each regains 3d8 + your spellcasting modifier hit points."
  },
  {
    title: "Mass Heal",
    level: 9, school: "Evocation",
    casting_time: "1 action", range: "60 feet", components: "V, S",
    duration: "Instantaneous",
    classes: ["Cleric"],
    tags: ["healing","area"],
    body: "A wave of healing energy restores up to 700 hit points among creatures of your choice within range. It also ends blindness, deafness, and diseases."
  },
  {
    title: "Mass Healing Word",
    level: 3, school: "Evocation",
    casting_time: "1 bonus action", range: "60 feet", components: "V",
    duration: "Instantaneous",
    classes: ["Bard","Cleric"],
    tags: ["healing"],
    body: "Up to six creatures you choose within range each regain hit points equal to 1d4 + your spellcasting modifier."
  },
  {
    title: "Mass Suggestion",
    level: 6, school: "Enchantment",
    casting_time: "1 action", range: "60 feet", components: "V, M (snake’s tongue and honeycomb or drop of sweet oil)",
    duration: "24 hours",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["control","charm"],
    body: "Influence up to twelve creatures to carry out a reasonable-sounding suggestion. A creature immune to charm is unaffected."
  },
  {
    title: "Maze",
    level: 8, school: "Conjuration",
    casting_time: "1 action", range: "60 feet", components: "V, S",
    duration: "Concentration, up to 10 minutes",
    classes: ["Wizard"],
    tags: ["banishment","control"],
    body: "Banish a creature into a labyrinthine demiplane. It can attempt an Intelligence check (DC 20) at the end of its turns to escape and reappear where it vanished."
  },
  {
    title: "Meld Into Stone",
    level: 3, school: "Transmutation",
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "8 hours",
    classes: ["Cleric","Druid"],
    tags: ["defense","utility"],
    body: "You and your equipment merge with a solid stone surface. You remain aware of surroundings but can’t move or act while inside."
  },
  {
    title: "Mending",
    level: 0, school: "Transmutation (Cantrip)",
    casting_time: "1 minute", range: "Touch", components: "V, S, M (two lodestones)",
    duration: "Instantaneous",
    classes: ["Bard","Cleric","Druid","Sorcerer","Wizard","Artificer"],
    tags: ["utility"],
    body: "Repairs a single break or tear in an object, restoring it to full function. Can’t restore magic to a destroyed magical item."
  },
  {
    title: "Message",
    level: 0, school: "Transmutation (Cantrip)",
    casting_time: "1 action", range: "120 feet", components: "V, S, M (copper wire)",
    duration: "1 round",
    classes: ["Bard","Sorcerer","Wizard","Artificer"],
    tags: ["communication"],
    body: "Point at a creature and whisper a message that only they can hear. They can reply in a whisper audible only to you."
  },
  {
    title: "Meteor Swarm",
    level: 9, school: "Evocation",
    casting_time: "1 action", range: "1 mile", components: "V, S",
    duration: "Instantaneous",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","area"],
    body: "Four blazing meteors strike at points you choose within range. Each creature in a 40-foot-radius sphere at those points takes 20d6 fire damage and 20d6 bludgeoning damage."
  },
  {
    title: "Mind Blank",
    level: 8, school: "Abjuration",
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "24 hours",
    classes: ["Bard","Wizard"],
    tags: ["defense","mental"],
    body: "Touch a willing creature to protect it from psychic damage, mind reading, and divination effects for the duration."
  },
  {
    title: "Minor Illusion",
    level: 0, school: "Illusion (Cantrip)",
    casting_time: "1 action", range: "30 feet", components: "S, M (bit of fleece)",
    duration: "1 minute",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["illusion","utility"],
    body: "Create a sound or image within range. Physical interaction or investigation reveals the illusion."
  },
  {
    title: "Mirage Arcane",
    level: 7, school: "Illusion",
    casting_time: "10 minutes", range: "Sight", components: "V, S",
    duration: "10 days",
    classes: ["Bard","Druid","Wizard"],
    tags: ["illusion","terrain"],
    body: "You make terrain in a 1-mile square look, sound, and feel like another type of terrain. Structures and objects also appear altered."
  },
  {
    title: "Mirror Image",
    level: 2, school: "Illusion",
    casting_time: "1 action", range: "Self", components: "V, S",
    duration: "1 minute",
    classes: ["Sorcerer","Wizard"],
    tags: ["defense"],
    body: "Three illusory duplicates of yourself appear. They move independently and cause attacks against you to have a chance to hit a duplicate instead."
  },
  {
    title: "Mislead",
    level: 5, school: "Illusion",
    casting_time: "1 action", range: "Self", components: "S",
    duration: "Concentration, up to 1 hour",
    classes: ["Bard","Wizard"],
    tags: ["illusion","invisibility"],
    body: "You become invisible while creating an illusory double that moves independently under your control."
  },
  {
    title: "Misty Step",
    level: 2, school: "Conjuration",
    casting_time: "1 bonus action", range: "30 feet", components: "V",
    duration: "Instantaneous",
    classes: ["Sorcerer","Warlock","Wizard","Paladin"],
    tags: ["mobility"],
    body: "You teleport up to 30 feet to an unoccupied space you can see in a flash of mist."
  },
  {
    title: "Modify Memory",
    level: 5, school: "Enchantment",
    casting_time: "1 action", range: "30 feet", components: "V, S",
    duration: "Concentration, up to 1 minute",
    classes: ["Bard","Wizard"],
    tags: ["charm","mental"],
    body: "You reshape a creature’s memory of an event within the last 24 hours, up to 10 minutes long. They must fail a Wisdom saving throw to be affected."
  },
  {
    title: "Moonbeam",
    level: 2, school: "Evocation",
    casting_time: "1 action", range: "120 feet", components: "V, S, M (several seeds and a bit of moonlight)",
    duration: "Concentration, up to 1 minute",
    classes: ["Druid","Paladin"],
    tags: ["damage","radiant"],
    body: "A beam of silvery light shines down in a 5-foot radius, 40-foot-high cylinder. Creatures entering or starting their turn take 2d10 radiant damage (Constitution save for half)."
  },
  {
    title: "Move Earth",
    level: 6, school: "Transmutation",
    casting_time: "10 minutes", range: "120 feet", components: "V, S, M (iron blade and small bag of earth)",
    duration: "Concentration, up to 2 hours",
    classes: ["Druid","Sorcerer","Wizard"],
    tags: ["terrain","utility"],
    body: "You reshape dirt, sand, or clay within a 40-foot cube. You can excavate, raise, or move earth to create trenches, hills, or barriers."
  },
  // ===== N =====
  {
    title: "Nondetection",
    level: 3, school: "Abjuration",
    casting_time: "1 action", range: "Touch", components: "V, S, M (diamond dust worth 25 gp, consumed)",
    duration: "8 hours",
    classes: ["Bard","Ranger","Wizard"],
    tags: ["defense","stealth","utility"],
    body: "You make a target—creature, object, or place—immune to divination magic. It can’t be targeted by scrying sensors or detected by magical means such as *locate object* or *clairvoyance*."
  },
  // ===== P =====
  {
    title: "Pass without Trace",
    level: 2, school: "Abjuration", concentration: true,
    casting_time: "1 action", range: "Self", components: "V, S, M (ash from a burned leaf of mistletoe and a sprig of spruce)",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Druid","Ranger"],
    tags: ["stealth","buff"],
    body: "A veil of shadows and silence radiates from you and your companions. Each creature you choose within 30 feet gains +10 to Stealth checks and can’t be tracked by nonmagical means."
  },
  {
    title: "Passwall",
    level: 5, school: "Transmutation",
    casting_time: "1 action", range: "30 feet", components: "V, S, M (pinch of sesame seeds)",
    duration: "1 hour",
    classes: ["Wizard"],
    tags: ["utility","terrain"],
    body: "Create a passage through wood, plaster, or stone up to 5 feet wide, 8 feet tall, and 20 feet deep. The tunnel disappears when the spell ends."
  },
  {
    title: "Phantasmal Killer",
    level: 4, school: "Illusion", concentration: true,
    casting_time: "1 action", range: "120 feet", components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Wizard"],
    tags: ["fear","damage","psychic"],
    body: "You create an illusory manifestation of the target’s worst fear. The creature makes a Wisdom save or becomes frightened and takes ongoing psychic damage each turn."
  },
  {
    title: "Phantom Steed",
    level: 3, school: "Illusion (Ritual)",
    casting_time: "1 minute", range: "30 feet", components: "V, S",
    duration: "1 hour",
    classes: ["Wizard"],
    tags: ["travel","utility"],
    body: "You summon a quasi-real, horse-like creature that serves as a mount. It has 19 AC, 13 HP, and a 100 ft. speed, disappearing when reduced to 0 HP or when the duration ends."
  },
  {
    title: "Planar Ally",
    level: 6, school: "Conjuration",
    casting_time: "10 minutes", range: "60 feet", components: "V, S",
    duration: "Instantaneous",
    classes: ["Cleric"],
    tags: ["summoning","planar"],
    body: "You call upon a celestial, elemental, or fiend loyal to your deity. It can choose whether to aid you and may demand payment for its service."
  },
  {
    title: "Planar Binding",
    level: 5, school: "Abjuration",
    casting_time: "1 hour", range: "60 feet", components: "V, S, M (jewel worth at least 1,000 gp, consumed)",
    duration: "24 hours",
    classes: ["Bard","Cleric","Druid","Wizard"],
    tags: ["control","planar"],
    body: "You attempt to bind a celestial, elemental, fey, or fiend within range. On a failed Charisma save, the creature is bound to serve you for the duration. Higher-level slots extend the duration."
  },
  {
    title: "Plane Shift",
    level: 7, school: "Conjuration",
    casting_time: "1 action", range: "Touch", components: "V, S, M (forked metal rod attuned to the destination plane)",
    duration: "Instantaneous",
    classes: ["Cleric","Sorcerer","Warlock","Wizard"],
    tags: ["travel","planar"],
    body: "Transport up to eight willing creatures to another plane of existence, or banish one unwilling creature that fails a Charisma save to a random location on another plane."
  },
  {
    title: "Plant Growth",
    level: 3, school: "Transmutation",
    casting_time: "1 action or 8 hours", range: "150 feet", components: "V, S",
    duration: "Instantaneous",
    classes: ["Bard","Druid","Ranger"],
    tags: ["terrain","nature"],
    body: "You can enrich land for long-term harvest over 8 hours or cause vegetation in a 100-foot radius to thicken instantly, halving movement speed for creatures moving through it."
  },
  {
    title: "Poison Spray",
    level: 0, school: "Conjuration (Cantrip)",
    casting_time: "1 action", range: "10 feet", components: "V, S",
    duration: "Instantaneous",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["damage","poison"],
    body: "You extend your hand and release a puff of noxious gas. The creature must succeed on a Constitution save or take 1d12 poison damage. Increases with character level."
  },
  {
    title: "Polymorph",
    level: 4, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "60 feet", components: "V, S, M (caterpillar cocoon)",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Bard","Druid","Sorcerer","Wizard"],
    tags: ["transformation","control"],
    body: "Transform a creature into a beast of CR equal to or less than its level. It assumes the new form’s statistics, including HP and abilities. Ends if reduced to 0 HP."
  },
  {
    title: "Power Word Kill",
    level: 9, school: "Enchantment",
    casting_time: "1 action", range: "60 feet", components: "V",
    duration: "Instantaneous",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["damage","instant death"],
    body: "Speak a word of power that instantly kills one creature with 100 hit points or fewer. No save or resistance applies."
  },
  {
    title: "Power Word Stun",
    level: 8, school: "Enchantment",
    casting_time: "1 action", range: "60 feet", components: "V",
    duration: "Instantaneous",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["control","stun"],
    body: "Speak a word of power that stuns one creature with 150 hit points or fewer. The creature can make a Con save at the end of each of its turns to end the effect."
  },
  {
    title: "Prayer of Healing",
    level: 2, school: "Evocation",
    casting_time: "10 minutes", range: "30 feet", components: "V",
    duration: "Instantaneous",
    classes: ["Cleric"],
    tags: ["healing","group"],
    body: "Up to six creatures of your choice regain 2d8 + your spellcasting modifier hit points after 10 minutes of prayer."
  },
  {
    title: "Prestidigitation",
    level: 0, school: "Transmutation (Cantrip)",
    casting_time: "1 action", range: "10 feet", components: "V, S",
    duration: "Up to 1 hour",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["utility","flavor"],
    body: "You perform minor magical tricks—create sparks, clean or soil an object, chill or warm food, produce odors, or leave a mark or symbol—that last up to an hour."
  },
  {
    title: "Prismatic Spray",
    level: 7, school: "Evocation",
    casting_time: "1 action", range: "Self (60-foot cone)", components: "V, S",
    duration: "Instantaneous",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","area","random"],
    body: "Eight multicolored rays shoot from your hand, each with different effects—fire, acid, poison, petrification, or banishment—determined by a random roll."
  },
  {
    title: "Prismatic Wall",
    level: 9, school: "Abjuration",
    casting_time: "1 action", range: "60 feet", components: "V, S",
    duration: "10 minutes",
    classes: ["Wizard"],
    tags: ["defense","barrier"],
    body: "Create a shimmering multicolored wall with seven layers, each with unique effects and resistances. Passing through requires overcoming each layer’s saving throw or damage."
  },
  {
    title: "Private Sanctum",
    level: 4, school: "Abjuration",
    casting_time: "10 minutes", range: "120 feet", components: "V, S, M (thin lead sheet, powdered iron, silver)",
    duration: "24 hours",
    classes: ["Wizard"],
    tags: ["ward","utility"],
    body: "You make a cube of space private and secure. It blocks teleportation, planar travel, and sound, and prevents scrying and divination within its area."
  },
  {
    title: "Produce Flame",
    level: 0, school: "Conjuration (Cantrip)",
    casting_time: "1 action", range: "Self", components: "V, S",
    duration: "10 minutes",
    classes: ["Druid"],
    tags: ["light","damage"],
    body: "A flame appears in your hand. It sheds light and can be thrown to deal 1d8 fire damage on a hit. The flame doesn’t harm you or your equipment."
  },
  {
    title: "Programmed Illusion",
    level: 6, school: "Illusion",
    casting_time: "1 action", range: "120 feet", components: "V, S, M (bit of fleece and jade dust worth 25 gp)",
    duration: "Until dispelled",
    classes: ["Bard","Wizard"],
    tags: ["illusion","triggered"],
    body: "Create an illusion that activates under specified conditions. It includes sound, smell, and temperature, persisting until dispelled."
  },
  {
    title: "Project Image",
    level: 7, school: "Illusion", concentration: true,
    casting_time: "1 action", range: "500 miles", components: "V, S, M (small replica of yourself)",
    duration: "Up to 1 day (Concentration)",
    classes: ["Bard","Wizard"],
    tags: ["illusion","utility"],
    body: "You project a perfect illusory duplicate of yourself that you can see, hear, and speak through, perceiving its surroundings as if present there."
  },
  {
    title: "Protection from Energy",
    level: 3, school: "Abjuration", concentration: true,
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Cleric","Druid","Ranger","Sorcerer","Wizard"],
    tags: ["defense","resistance"],
    body: "Touch a willing creature to grant resistance to one damage type of your choice: acid, cold, fire, lightning, or thunder."
  },
  {
    title: "Protection from Evil and Good",
    level: 1, school: "Abjuration", concentration: true,
    casting_time: "1 action", range: "Touch", components: "V, S, M (holy water or powdered silver and iron)",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Cleric","Paladin","Warlock","Wizard"],
    tags: ["defense","ward"],
    body: "Protect a creature against aberrations, celestials, elementals, fey, fiends, and undead. These creatures have disadvantage on attacks and cannot charm, frighten, or possess the target."
  },
  {
    title: "Protection from Poison",
    level: 2, school: "Abjuration",
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "1 hour",
    classes: ["Cleric","Druid","Paladin","Ranger"],
    tags: ["healing","resistance"],
    body: "Neutralizes one poison affecting the target and grants advantage on saving throws against poison and resistance to poison damage for the duration."
  },
  {
    title: "Purify Food and Drink",
    level: 1, school: "Transmutation (Ritual)",
    casting_time: "1 action", range: "10 feet", components: "V, S",
    duration: "Instantaneous",
    classes: ["Cleric","Druid","Paladin"],
    tags: ["utility","ritual"],
    body: "All nonmagical food and drink within a 5-foot radius sphere centered on a point of your choice is purified and rendered free of poison and disease."
  },
  // ===== R =====
  {
    title: "Raise Dead",
    level: 5, school: "Necromancy",
    casting_time: "1 hour", range: "Touch", components: "V, S, M (diamond worth 500 gp, consumed)",
    duration: "Instantaneous",
    classes: ["Bard","Cleric","Paladin"],
    tags: ["healing","revival"],
    body: "You return a dead creature to life if it has been dead no longer than 10 days. It returns with 1 hit point and suffers a -4 penalty to all rolls until it finishes four long rests."
  },
  {
    title: "Ray of Enfeeblement",
    level: 2, school: "Necromancy",
    casting_time: "1 action", range: "60 feet", components: "V, S",
    duration: "Concentration, up to 1 minute",
    classes: ["Warlock","Wizard"],
    tags: ["debuff","damage"],
    body: "Make a ranged spell attack; on a hit, the target deals only half damage with weapon attacks that use Strength until the spell ends."
  },
  {
    title: "Ray of Frost",
    level: 0, school: "Evocation (Cantrip)",
    casting_time: "1 action", range: "60 feet", components: "V, S",
    duration: "Instantaneous",
    classes: ["Sorcerer","Wizard","Artificer"],
    tags: ["damage","cold","cantrip"],
    body: "Make a ranged spell attack dealing 1d8 cold damage and reducing the target’s speed by 10 feet until the start of your next turn. Damage increases with character level."
  },
  {
    title: "Regenerate",
    level: 7, school: "Transmutation",
    casting_time: "1 minute", range: "Touch", components: "V, S, M (prayer wheel and holy water)",
    duration: "1 hour",
    classes: ["Bard","Cleric","Druid"],
    tags: ["healing","restoration"],
    body: "The target regains 4d8 + 15 hit points immediately, then 1 hit point every round for the next hour. The spell also restores severed body parts after 2 minutes."
  },
  {
    title: "Reincarnate",
    level: 5, school: "Transmutation",
    casting_time: "1 hour", range: "Touch", components: "V, S, M (oils worth 1,000 gp, consumed)",
    duration: "Instantaneous",
    classes: ["Druid"],
    tags: ["revival","transformation"],
    body: "You bring a dead creature back to life in a new adult body determined randomly from a reincarnation table. The soul must be willing and free."
  },
  {
    title: "Remove Curse",
    level: 3, school: "Abjuration",
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "Instantaneous",
    classes: ["Cleric","Paladin","Warlock","Wizard"],
    tags: ["utility","curse removal"],
    body: "Touch a creature or object to end all curses affecting it. If the object is cursed, the curse is broken, but the magic item remains cursed unless the item’s enchantment is lifted separately."
  },
  {
    title: "Resilient Sphere",
    level: 4, school: "Evocation",
    casting_time: "1 action", range: "30 feet", components: "V, S, M (crystal sphere)",
    duration: "Concentration, up to 1 minute",
    classes: ["Wizard"],
    tags: ["defense","control"],
    body: "A shimmering sphere of force encloses a creature or object, making it immune to damage. Nothing can pass through it, and the creature inside can’t attack or be affected by attacks."
  },
  {
    title: "Resistance",
    level: 0, school: "Abjuration (Cantrip)",
    casting_time: "1 action", range: "Touch", components: "V, S, M (miniature cloak)",
    duration: "Concentration, up to 1 minute",
    classes: ["Cleric","Druid"],
    tags: ["buff","saving throw"],
    body: "Touch one willing creature. Once before the spell ends, it can roll a d4 and add it to one saving throw of its choice."
  },
  {
    title: "Reverse Gravity",
    level: 7, school: "Transmutation",
    casting_time: "1 action", range: "100 feet", components: "V, S, M (magnetic lodestone and iron filings)",
    duration: "Concentration, up to 1 minute",
    classes: ["Druid","Sorcerer","Wizard"],
    tags: ["control","area"],
    body: "Reverse gravity in a 50-foot-radius, 100-foot-high cylinder. Creatures and objects fall upward and remain suspended until the spell ends, then fall back down."
  },
  {
    title: "Revivify",
    level: 3, school: "Conjuration",
    casting_time: "1 action", range: "Touch", components: "V, S, M (diamond worth 300 gp, consumed)",
    duration: "Instantaneous",
    classes: ["Cleric","Paladin","Artificer"],
    tags: ["healing","revival"],
    body: "You return a creature that has died within the last minute to life with 1 hit point. The spell can’t restore missing body parts or fix death from old age."
  },
  {
    title: "Rope Trick",
    level: 2, school: "Transmutation",
    casting_time: "1 action", range: "Touch", components: "V, S, M (powdered corn extract and twisted loop of parchment)",
    duration: "1 hour",
    classes: ["Wizard"],
    tags: ["utility","sanctuary"],
    body: "You touch a rope that rises and hangs in the air, leading to an extradimensional space. Up to eight creatures can climb inside, hidden from view until the spell ends."
  },
  // ===== S =====
  {
    title: "Sacred Flame",
    level: 0, school: "Evocation (Cantrip)",
    casting_time: "1 action", range: "60 feet", components: "V, S",
    duration: "Instantaneous",
    classes: ["Cleric"],
    tags: ["damage","radiant"],
    body: "Flame-like radiance descends on a creature within range. It must succeed on a Dexterity save or take 1d8 radiant damage. The target gains no benefit from cover against this save."
  },
  {
    title: "Sanctuary",
    level: 1, school: "Abjuration",
    casting_time: "1 bonus action", range: "30 feet", components: "V, S, M (silver mirror)",
    duration: "1 minute",
    classes: ["Cleric","Paladin"],
    tags: ["defense"],
    body: "You ward a creature against attack. Until the spell ends, any creature targeting the warded one with an attack or harmful spell must first make a Wisdom save or choose a new target."
  },
  {
    title: "Scorching Ray",
    level: 2, school: "Evocation",
    casting_time: "1 action", range: "120 feet", components: "V, S",
    duration: "Instantaneous",
    classes: ["Sorcerer","Wizard"],
    tags: ["damage","fire"],
    body: "You create three rays of fire and hurl them at targets within range. Each ray is a ranged spell attack dealing 2d6 fire damage. Add one ray for every slot level above 2nd."
  },
  {
    title: "Scrying",
    level: 5, school: "Divination", concentration: true,
    casting_time: "10 minutes", range: "Self", components: "V, S, M (focus worth 1,000 gp)",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Bard","Cleric","Druid","Warlock","Wizard"],
    tags: ["divination","utility"],
    body: "You create an invisible sensor that allows you to see and hear a particular creature or location. Targets can resist if unwilling or unfamiliar."
  },
  {
    title: "Secret Chest",
    level: 4, school: "Conjuration",
    casting_time: "1 action", range: "Touch", components: "V, S, M (chest worth 5,000 gp + tiny replica worth 50 gp)",
    duration: "Until dispelled",
    classes: ["Wizard"],
    tags: ["utility","storage"],
    body: "You hide a chest on the Ethereal Plane. The smaller replica allows you to recall or dismiss it. The chest is lost forever if not retrieved within 60 days."
  },
  {
    title: "See Invisibility",
    level: 2, school: "Divination",
    casting_time: "1 action", range: "Self", components: "V, S, M (pinch of talc and powdered silver)",
    duration: "1 hour",
    classes: ["Bard","Sorcerer","Wizard"],
    tags: ["utility","vision"],
    body: "You can see invisible creatures and objects as if they were visible, and you also see into the Ethereal Plane within 10 feet."
  },
  {
    title: "Seeming",
    level: 5, school: "Illusion",
    casting_time: "1 action", range: "30 feet", components: "V, S",
    duration: "8 hours",
    classes: ["Bard","Sorcerer","Wizard"],
    tags: ["illusion","disguise"],
    body: "You alter the appearance of any number of creatures you can see, giving them new clothing, armor, and physical features. The changes withstand casual inspection but not physical touch."
  },
  {
    title: "Sending",
    level: 3, school: "Evocation",
    casting_time: "1 action", range: "Unlimited (across planes)", components: "V, S, M (short piece of fine copper wire)",
    duration: "Instantaneous",
    classes: ["Bard","Cleric","Wizard"],
    tags: ["communication"],
    body: "You send a 25-word message to a creature you know. It hears the message and can reply in kind, even across planes of existence (though there’s a small failure chance)."
  },
  {
    title: "Sequester",
    level: 7, school: "Transmutation",
    casting_time: "1 action", range: "Touch", components: "V, S, M (powdered diamond, emerald, ruby, and sapphire worth 5,000 gp)",
    duration: "Until dispelled",
    classes: ["Wizard"],
    tags: ["utility","ward"],
    body: "You render a creature or object invisible and hidden from all forms of detection, including divination. If cast on a creature, it enters suspended animation until the spell ends or the conditions you specify are met."
  },
  {
    title: "Shadow of Moil",
    level: 4, school: "Necromancy", concentration: true,
    casting_time: "1 action", range: "Self", components: "V, S, M (piece of coal and flask of ink)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Warlock"],
    tags: ["defense","damage","darkness"],
    body: "Flames of shadow wreathe your body, heavily obscuring you from others. You take on a dim light aura and deal fire damage to attackers who hit you with melee attacks."
  },
  {
    title: "Shapechange",
    level: 9, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "Self", components: "V, S, M (jade circlet worth 1,500 gp)",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Druid","Wizard"],
    tags: ["transformation","utility"],
    body: "You transform into any creature whose challenge rating is equal to or less than your level. You gain its physical abilities while retaining your own mind and alignment."
  },
  {
    title: "Shatter",
    level: 2, school: "Evocation",
    casting_time: "1 action", range: "60 feet", components: "V, S, M (tiny chip of mica)",
    duration: "Instantaneous",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["damage","thunder"],
    body: "A loud ringing noise erupts from a point you choose, dealing 3d8 thunder damage (Con save for half) to creatures and objects. Deals extra damage to inorganic materials."
  },
  {
    title: "Shield",
    level: 1, school: "Abjuration",
    casting_time: "1 reaction (when hit or targeted by *magic missile*)", range: "Self", components: "V, S",
    duration: "1 round",
    classes: ["Sorcerer","Wizard"],
    tags: ["defense","reaction"],
    body: "An invisible barrier of force grants +5 AC until the start of your next turn. It also negates *magic missile* attacks against you."
  },
  {
    title: "Shield of Faith",
    level: 1, school: "Abjuration", concentration: true,
    casting_time: "1 bonus action", range: "60 feet", components: "V, S, M (small parchment with holy text)",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Cleric","Paladin"],
    tags: ["defense","buff"],
    body: "A shimmering field surrounds a creature, granting +2 AC for the duration."
  },
  {
    title: "Shillelagh",
    level: 0, school: "Transmutation (Cantrip)",
    casting_time: "1 bonus action", range: "Touch", components: "V, S, M (mistletoe, shamrock leaf, or club)",
    duration: "1 minute",
    classes: ["Druid"],
    tags: ["melee","buff"],
    body: "You imbue a club or quarterstaff with nature’s power. It becomes magical, using your spellcasting ability for attack and damage rolls and dealing 1d8 bludgeoning damage."
  },
  {
    title: "Shocking Grasp",
    level: 0, school: "Evocation (Cantrip)",
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "Instantaneous",
    classes: ["Sorcerer","Wizard","Artificer"],
    tags: ["damage","melee","lightning"],
    body: "Lightning springs from your hand for a melee spell attack. The target takes 1d8 lightning damage and can’t take reactions until its next turn."
  },
  {
    title: "Silence",
    level: 2, school: "Illusion", concentration: true,
    casting_time: "1 action", range: "120 feet", components: "V, S",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Bard","Cleric","Ranger"],
    tags: ["control","area"],
    body: "You create a 20-foot-radius sphere of silence. No sound passes through it, and creatures inside are immune to thunder damage and deafened."
  },
  {
    title: "Silent Image",
    level: 1, school: "Illusion", concentration: true,
    casting_time: "1 action", range: "60 feet", components: "V, S, M (bit of fleece)",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Bard","Sorcerer","Wizard"],
    tags: ["illusion","utility"],
    body: "Create an image no larger than a 15-foot cube. You can move it and alter its appearance as an action. Physical interaction reveals it as an illusion."
  },
  {
    title: "Simulacrum",
    level: 7, school: "Illusion",
    casting_time: "12 hours", range: "Touch", components: "V, S, M (snow, ice, hair, fingernail clippings, ruby dust worth 1,500 gp)",
    duration: "Until dispelled",
    classes: ["Wizard"],
    tags: ["creation","utility"],
    body: "You craft an illusory duplicate of a creature that acts independently but obeys your commands. It has half the original’s HP and can’t regain hit points."
  },
  {
    title: "Sleep",
    level: 1, school: "Enchantment",
    casting_time: "1 action", range: "90 feet", components: "V, S, M (fine sand or rose petals)",
    duration: "1 minute",
    classes: ["Bard","Sorcerer","Wizard"],
    tags: ["control","debuff"],
    body: "Magically sends creatures into slumber starting with the lowest HP. Affects up to 5d8 hit points of creatures within 20 feet. Ends if they take damage or are shaken awake."
  },
  {
    title: "Sleet Storm",
    level: 3, school: "Conjuration", concentration: true,
    casting_time: "1 action", range: "150 feet", components: "V, S, M (pinch of dust, drops of water, tiny ice)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Druid","Sorcerer","Wizard"],
    tags: ["control","area","cold"],
    body: "A 40-foot-radius cylinder of sleet and ice makes terrain difficult, extinguishes flames, and causes creatures to fall prone or lose concentration checks."
  },
  {
    title: "Slow",
    level: 3, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "120 feet", components: "V, S, M (drop of molasses)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Sorcerer","Wizard"],
    tags: ["control","debuff"],
    body: "You slow up to six creatures in a 40-foot cube. Their speed is halved, AC and Dex saves are reduced, and they can take only one attack or spell per turn."
  },
  {
    title: "Spare the Dying",
    level: 0, school: "Necromancy (Cantrip)",
    casting_time: "1 action", range: "Touch", components: "V, S",
    duration: "Instantaneous",
    classes: ["Cleric"],
    tags: ["healing","stabilize"],
    body: "You touch a living creature at 0 HP, stabilizing it without the need for a death saving throw."
  },
  {
    title: "Speak with Animals",
    level: 1, school: "Divination (Ritual)",
    casting_time: "1 action", range: "Self", components: "V, S",
    duration: "10 minutes",
    classes: ["Bard","Druid","Ranger"],
    tags: ["communication","nature","ritual"],
    body: "You gain the ability to comprehend and verbally communicate with beasts. The knowledge and awareness of beasts are limited by their intelligence."
  },
  {
    title: "Speak with Dead",
    level: 3, school: "Necromancy",
    casting_time: "1 action", range: "10 feet", components: "V, S, M (burning incense)",
    duration: "10 minutes",
    classes: ["Bard","Cleric"],
    tags: ["communication","necromancy"],
    body: "You grant a corpse the semblance of life and awareness. It can answer five questions you pose, though it isn’t compelled to be truthful or friendly."
  },
  {
    title: "Speak with Plants",
    level: 3, school: "Transmutation",
    casting_time: "1 action", range: "Self (30-foot radius)", components: "V, S",
    duration: "10 minutes",
    classes: ["Bard","Druid","Ranger"],
    tags: ["communication","nature"],
    body: "You awaken plants’ limited sentience, allowing you to question them about the area or influence them to clear or entangle terrain."
  },
  {
    title: "Spider Climb",
    level: 2, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "Touch", components: "V, S, M (drop of bitumen and spider)",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Sorcerer","Warlock","Wizard"],
    tags: ["mobility"],
    body: "A willing creature can move up, down, and across vertical surfaces and ceilings while leaving its hands free."
  },
  {
    title: "Spike Growth",
    level: 2, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "150 feet", components: "V, S, M (seven sharp thorns or small twigs)",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Druid","Ranger"],
    tags: ["damage","terrain","control"],
    body: "Twisting vines and spikes erupt in a 20-foot radius. Creatures moving through the area take 2d4 piercing damage for every 5 feet moved."
  },
  {
    title: "Spirit Guardians",
    level: 3, school: "Conjuration", concentration: true,
    casting_time: "1 action", range: "Self (15-foot radius)", components: "V, S, M (holy symbol)",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Cleric"],
    tags: ["damage","control","radiant"],
    body: "You summon spirits that protect you. Enemies entering the area take 3d8 radiant or necrotic damage (Wisdom save for half) and have halved speed."
  },
  {
    title: "Spiritual Weapon",
    level: 2, school: "Evocation",
    casting_time: "1 bonus action", range: "60 feet", components: "V, S",
    duration: "1 minute",
    classes: ["Cleric"],
    tags: ["damage","bonus action"],
    body: "You create a floating spectral weapon that deals 1d8 + your modifier force damage. It can move and strike as a bonus action each round."
  },
  {
    title: "Stinking Cloud",
    level: 3, school: "Conjuration", concentration: true,
    casting_time: "1 action", range: "90 feet", components: "V, S, M (rotten egg or skunk cabbage)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Bard","Sorcerer","Wizard"],
    tags: ["control","poison"],
    body: "A 20-foot-radius cloud of nauseating gas fills the area, obscuring vision. Creatures inside must make Con saves or spend their turn retching."
  },
  {
    title: "Stone Shape",
    level: 4, school: "Transmutation",
    casting_time: "1 action", range: "Touch", components: "V, S, M (soft clay, to mimic stone shape)",
    duration: "Instantaneous",
    classes: ["Cleric","Druid","Wizard"],
    tags: ["utility","terrain"],
    body: "You shape a stone object or surface into any form that suits your purpose, such as a door, idol, or passage."
  },
  {
    title: "Stoneskin",
    level: 4, school: "Abjuration", concentration: true,
    casting_time: "1 action", range: "Touch", components: "V, S, M (diamond dust worth 100 gp, consumed)",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Druid","Ranger","Sorcerer","Wizard"],
    tags: ["defense","resistance"],
    body: "Touch a creature to grant resistance to nonmagical bludgeoning, piercing, and slashing damage."
  },
  {
    title: "Storm of Vengeance",
    level: 9, school: "Conjuration", concentration: true,
    casting_time: "1 action", range: "Sight", components: "V, S",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Cleric","Druid"],
    tags: ["area","damage","control"],
    body: "A massive storm cloud forms overhead. Each round brings new effects: acid rain, lightning, hail, and gale-force winds. Extremely destructive over wide areas."
  },
  {
    title: "Suggestion",
    level: 2, school: "Enchantment", concentration: true,
    casting_time: "1 action", range: "30 feet", components: "V, M (snake’s tongue and honeycomb or sweet oil)",
    duration: "Up to 8 hours (Concentration)",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["charm","control"],
    body: "Influence a creature with a magically compelling suggestion that sounds reasonable. It follows the command unless it would cause obvious harm."
  },
  {
    title: "Sunbeam",
    level: 6, school: "Evocation", concentration: true,
    casting_time: "1 action", range: "Self (60-foot line)", components: "V, S, M (magnifying lens)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Druid","Sorcerer","Wizard"],
    tags: ["damage","radiant"],
    body: "A brilliant beam of sunlight flashes out from your hand. Each creature in the line makes a Con save or takes 6d8 radiant damage and is blinded."
  },
  {
    title: "Sunburst",
    level: 8, school: "Evocation",
    casting_time: "1 action", range: "150 feet", components: "V, S, M (fire and diamond dust worth 500 gp)",
    duration: "Instantaneous",
    classes: ["Druid","Sorcerer","Wizard"],
    tags: ["area","radiant","damage"],
    body: "Brilliant sunlight flashes in a 60-foot radius sphere. Creatures make Con saves or take 12d6 radiant damage and are blinded for 1 minute."
  },
  {
    title: "Symbol",
    level: 7, school: "Abjuration",
    casting_time: "1 minute", range: "Touch", components: "V, S, M (mercury, phosphorus, diamond, and opal worth 1,000 gp)",
    duration: "Until dispelled or triggered",
    classes: ["Cleric","Wizard"],
    tags: ["trap","ward"],
    body: "You inscribe a magical glyph that triggers when conditions are met, unleashing fear, pain, sleep, death, or insanity depending on the symbol chosen."
  },
  // ===== T =====
  {
    title: "Telekinesis",
    level: 5, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "60 feet", components: "V, S",
    duration: "Up to 10 minutes (Concentration)",
    classes: ["Sorcerer","Wizard"],
    tags: ["control","utility"],
    body: "You move objects or creatures with your mind. Each round, you can move an object weighing up to 1,000 pounds or contest a creature’s Strength check to move or restrain it."
  },
  {
    title: "Telepathic Bond",
    level: 5, school: "Divination (Ritual)",
    casting_time: "1 action", range: "30 feet", components: "V, S, M (eggshells from two creatures of the same kind)",
    duration: "1 hour",
    classes: ["Wizard"],
    tags: ["communication","ritual"],
    body: "You forge a telepathic link between up to eight willing creatures within range. The link works regardless of language or distance, even across planes."
  },
  {
    title: "Teleport",
    level: 7, school: "Conjuration",
    casting_time: "1 action", range: "10 feet", components: "V",
    duration: "Instantaneous",
    classes: ["Bard","Sorcerer","Wizard"],
    tags: ["travel","utility"],
    body: "You and up to eight willing creatures or a single large object instantly travel to a destination you specify. The accuracy depends on your familiarity with the location."
  },
  {
    title: "Teleportation Circle",
    level: 5, school: "Conjuration",
    casting_time: "1 minute", range: "10 feet", components: "V, M (rare chalks and inks worth 50 gp, consumed)",
    duration: "1 round",
    classes: ["Bard","Sorcerer","Wizard"],
    tags: ["travel","utility"],
    body: "You create a temporary teleportation circle that connects to a permanent circle you know. The circle lasts one round and allows instant travel."
  },
  {
    title: "Thaumaturgy",
    level: 0, school: "Transmutation (Cantrip)",
    casting_time: "1 action", range: "30 feet", components: "V",
    duration: "Up to 1 minute",
    classes: ["Cleric"],
    tags: ["utility","flavor"],
    body: "Manifest minor wonders such as booming your voice, shaking the ground, altering your eyes, or opening doors. You can have up to three effects active at once."
  },
  {
    title: "Thunderwave",
    level: 1, school: "Evocation",
    casting_time: "1 action", range: "Self (15-foot cube)", components: "V, S",
    duration: "Instantaneous",
    classes: ["Bard","Cleric","Druid","Sorcerer","Wizard"],
    tags: ["damage","thunder","area"],
    body: "A wave of thunderous force sweeps from you. Creatures in the area make Con saves or take 2d8 thunder damage and are pushed 10 feet. Loose objects are pushed away and audibly boom out to 300 feet."
  },
  {
    title: "Time Stop",
    level: 9, school: "Transmutation",
    casting_time: "1 action", range: "Self", components: "V",
    duration: "Instantaneous",
    classes: ["Sorcerer","Wizard"],
    tags: ["time","utility"],
    body: "You briefly stop time for everyone but yourself. You take 1d4 + 1 turns in a row, during which you can’t affect other creatures or objects directly."
  },
  {
    title: "Tiny Hut",
    level: 3, school: "Evocation (Ritual)",
    casting_time: "1 minute", range: "Self (10-foot radius hemisphere)", components: "V, S, M (small crystal bead)",
    duration: "8 hours",
    classes: ["Bard","Wizard"],
    tags: ["utility","sanctuary"],
    body: "A dome of force shelters up to nine creatures. The temperature inside is comfortable and the dome is opaque from the outside but transparent from within."
  },
  {
    title: "Tongues",
    level: 3, school: "Divination",
    casting_time: "1 action", range: "Touch", components: "V, M (small clay model of a ziggurat)",
    duration: "1 hour",
    classes: ["Bard","Cleric","Sorcerer","Warlock","Wizard"],
    tags: ["communication"],
    body: "Touch a creature to grant it the ability to understand any spoken language and be understood by any creature that knows a language."
  },
  {
    title: "Transport via Plants",
    level: 6, school: "Conjuration",
    casting_time: "1 action", range: "10 feet", components: "V, S",
    duration: "1 round",
    classes: ["Druid"],
    tags: ["travel","nature"],
    body: "You create a magical link between two Large or larger plants, allowing instant travel between them on the same plane of existence."
  },
  {
    title: "Tree Stride",
    level: 5, school: "Conjuration",
    casting_time: "1 action", range: "Self", components: "V, S",
    duration: "1 minute",
    classes: ["Druid","Ranger"],
    tags: ["travel","nature"],
    body: "You can step into a living tree and emerge from another tree of the same kind within 500 feet as part of your movement once per round."
  },
  {
    title: "True Polymorph",
    level: 9, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "30 feet", components: "V, S, M (drop of mercury, gum arabic, and smoke)",
    duration: "Up to 1 hour (Concentration)",
    classes: ["Bard","Warlock","Wizard"],
    tags: ["transformation","permanent"],
    body: "Transform a creature or object into another creature or object. If concentration lasts the full hour, the transformation becomes permanent."
  },
  {
    title: "True Resurrection",
    level: 9, school: "Necromancy",
    casting_time: "1 hour", range: "Touch", components: "V, S, M (diamond worth 25,000 gp)",
    duration: "Instantaneous",
    classes: ["Cleric","Druid"],
    tags: ["healing","revival"],
    body: "You return a creature to life regardless of how long it has been dead (up to 200 years). The creature is restored to full health and cleansed of all ailments and curses."
  },
  {
    title: "True Seeing",
    level: 6, school: "Divination",
    casting_time: "1 action", range: "Touch", components: "V, S, M (ointment for the eyes worth 25 gp, consumed)",
    duration: "1 hour",
    classes: ["Bard","Cleric","Sorcerer","Warlock","Wizard"],
    tags: ["vision","utility"],
    body: "Touch a willing creature to grant it true sight out to 120 feet, allowing it to see secret doors, invisible creatures, and into the Ethereal Plane."
  },
  {
    title: "True Strike",
    level: 0, school: "Divination (Cantrip)",
    casting_time: "1 action", range: "30 feet", components: "S",
    duration: "Concentration, up to 1 round",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["buff","attack"],
    body: "You extend your hand toward a target, granting yourself advantage on your first attack roll against it on your next turn."
  },
  // ===== U =====
  {
    title: "Unseen Servant",
    level: 1, school: "Conjuration (Ritual)",
    casting_time: "1 action", range: "60 feet", components: "V, S, M (piece of string and bit of wood)",
    duration: "1 hour",
    classes: ["Bard","Warlock","Wizard"],
    tags: ["utility","ritual"],
    body: "You create an invisible, mindless, shapeless force that performs simple tasks at your command—fetching, cleaning, opening doors, lighting fires, etc. It can move up to 15 feet per round and can’t attack."
  },
  // ===== V =====
  {
    title: "Vampiric Touch",
    level: 3, school: "Necromancy",
    casting_time: "1 action", range: "Self", components: "V, S",
    duration: "Concentration, up to 1 minute",
    classes: ["Warlock","Wizard"],
    tags: ["attack","healing","melee"],
    body: "Your hand becomes a conduit of life-draining magic. Make a melee spell attack; on hit, the target takes necrotic damage and you regain hit points equal to half the damage dealt each round while concentration is maintained."
  },
  {
    title: "Vicious Mockery",
    level: 0, school: "Enchantment (Cantrip)",
    casting_time: "1 action", range: "60 feet", components: "V",
    duration: "Instantaneous",
    classes: ["Bard"],
    tags: ["psychic","attack","debuff"],
    body: "You unleash a cutting insult laced with subtle enchantment. The target takes minor psychic damage and has disadvantage on its next attack roll if it fails a Wisdom save."
  },
  // ===== W =====
  {
    title: "Wall of Fire",
    level: 4, school: "Evocation",
    casting_time: "1 action", range: "120 feet", components: "V, S, M (a small piece of phosphorus)",
    duration: "Concentration, up to 1 minute",
    classes: ["Druid","Sorcerer","Wizard"],
    tags: ["damage","area","control"],
    body: "You create a wall of flames that burns creatures on one side. The wall deals fire damage to creatures when it appears and to those ending their turn nearby."
  },
  {
    title: "Wall of Force",
    level: 5, school: "Evocation",
    casting_time: "1 action", range: "120 feet", components: "V, S, M (a pinch of powdered diamond worth 200 gp)",
    duration: "10 minutes",
    classes: ["Wizard"],
    tags: ["barrier","defense"],
    body: "You create an invisible wall of pure force that is immune to damage and can’t be dispelled by magic. It blocks movement and spells can’t pass through it."
  },
  {
    title: "Wall of Ice",
    level: 6, school: "Evocation",
    casting_time: "1 action", range: "120 feet", components: "V, S, M (a small piece of quartz)",
    duration: "Concentration, up to 10 minutes",
    classes: ["Wizard"],
    tags: ["barrier","damage","control"],
    body: "A wall of ice appears, either as a flat barrier or dome. Each section has hit points and can be destroyed; when broken, the shards explode with cold damage."
  },
  {
    title: "Wall of Stone",
    level: 5, school: "Evocation",
    casting_time: "1 action", range: "120 feet", components: "V, S, M (a small block of granite)",
    duration: "Concentration, up to 10 minutes",
    classes: ["Druid","Wizard"],
    tags: ["barrier","utility"],
    body: "You conjure a wall of solid stone that can form bridges, barriers, or enclosures. If concentration is maintained for the full duration, the wall becomes permanent."
  },
  {
    title: "Wall of Thorns",
    level: 6, school: "Conjuration",
    casting_time: "1 action", range: "120 feet", components: "V, S, M (a handful of thorns)",
    duration: "Concentration, up to 10 minutes",
    classes: ["Druid"],
    tags: ["damage","control","terrain"],
    body: "A thick wall of twisting vines and thorns sprouts up, dealing piercing damage to creatures entering or ending their turn in it and slowing their movement."
  },
  {
    title: "Warding Bond",
    level: 2, school: "Abjuration",
    casting_time: "1 action", range: "Touch", components: "V, S, M (a pair of platinum rings worth 50 gp each, which the caster and target must wear)",
    duration: "1 hour",
    classes: ["Cleric"],
    tags: ["defense","buff"],
    body: "You forge a magical link between yourself and another creature. The target gains +1 AC and saving throws, and you take half the damage it receives."
  },
  {
    title: "Water Breathing",
    level: 3, school: "Transmutation (Ritual)",
    casting_time: "1 action", range: "30 feet", components: "V, S, M (a short reed or piece of straw)",
    duration: "24 hours",
    classes: ["Druid","Ranger","Sorcerer","Wizard"],
    tags: ["utility","ritual"],
    body: "Up to ten willing creatures gain the ability to breathe underwater for the duration."
  },
  {
    title: "Water Walk",
    level: 3, school: "Transmutation (Ritual)",
    casting_time: "1 action", range: "30 feet", components: "V, S, M (a piece of cork)",
    duration: "1 hour",
    classes: ["Cleric","Druid","Ranger"],
    tags: ["utility","ritual"],
    body: "This spell allows creatures to move across liquid surfaces—such as water, acid, or even lava—as if they were solid ground."
  },
  {
    title: "Web",
    level: 2, school: "Conjuration",
    casting_time: "1 action", range: "60 feet", components: "V, S, M (a bit of spiderweb)",
    duration: "Concentration, up to 1 hour",
    classes: ["Sorcerer","Wizard"],
    tags: ["control","restrain"],
    body: "You create a sticky mass of webs that fills a 20-foot cube, restraining creatures that fail a Dexterity saving throw."
  },
  {
    title: "Weird",
    level: 9, school: "Illusion",
    casting_time: "1 action", range: "120 feet", components: "V, S",
    duration: "Concentration, up to 1 minute",
    classes: ["Wizard"],
    tags: ["psychic","fear","control"],
    body: "You project a nightmarish vision that frightens creatures and causes psychic damage as long as they remain terrified."
  },
  {
    title: "Wind Walk",
    level: 6, school: "Transmutation",
    casting_time: "1 minute", range: "30 feet", components: "V, S, M (fire and holy water)",
    duration: "8 hours",
    classes: ["Druid"],
    tags: ["travel","utility"],
    body: "You and up to ten willing creatures transform into clouds of mist, gaining a flying speed and damage resistance while in that form."
  },
  {
    title: "Wind Wall",
    level: 3, school: "Evocation",
    casting_time: "1 action", range: "120 feet", components: "V, S, M (a tiny fan and feather of exotic origin)",
    duration: "Concentration, up to 1 minute",
    classes: ["Cleric","Druid","Ranger"],
    tags: ["control","defense"],
    body: "You create a vertical wall of wind that keeps out gases, ranged projectiles, and small flying creatures while dispersing vapors and fog."
  },
  {
    title: "Wish",
    level: 9, school: "Conjuration",
    casting_time: "1 action", range: "Self", components: "V",
    duration: "Instantaneous",
    classes: ["Sorcerer","Wizard"],
    tags: ["ultimate","utility","creation"],
    body: "The mightiest spell known to mortals. You can duplicate any spell of 8th level or lower without material components, or reshape reality itself—with potential perilous side effects."
  },
  {
    title: "Word of Recall",
    level: 6, school: "Conjuration",
    casting_time: "1 action", range: "5 feet", components: "V",
    duration: "Instantaneous",
    classes: ["Cleric"],
    tags: ["teleportation","safety"],
    body: "You and up to five willing creatures within range instantly teleport to a sanctuary you have designated through prior casting of this spell."
  },
  // ===== Z =====
  {
    title: "Zone of Truth",
    level: 2, school: "Enchantment",
    casting_time: "1 action", range: "60 feet", components: "V, S",
    duration: "10 minutes",
    classes: ["Bard","Cleric","Paladin"],
    tags: ["social","control"],
    body: "You create a magical zone that compels honesty. Creatures within a 15-foot radius must make a Charisma saving throw or be unable to speak deliberate lies while in the area. You know whether each creature succeeds or fails its save."
  }
  ];

  window.SPELLS_DATA = SPELLS_DATA;