  const SPELLS_DATA = [
    /* ===== A ===== */
    {
      title: "Abi-Dalzim's Horrid Wilting",
      level: 8, school: "Necromancy",
      casting_time: "1 action",
      range: "150 ft",
      components: "V,S,M",
      duration: "Instantaneous",
      concentration: false,
      classes: ["Sorcerer","Wizard"],
      body: `You draw the moisture from every creature in a 30-foot cube within range. Each creature in that area must make a Constitution saving throw. Constructs and undead aren't affected, and plants and water elementals make this saving throw with disadvantage. A creature takes 12d8 necrotic damage on a failed save, or half as much damage on a successful one. Nonmagical plants in the area that aren't creatures, such as trees and shrubs, wither and die instantly.`,
      tags: ["damage","necrotic","area","save"]
    },
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
      body: `Dex save or take acid damage. You can target two creatures if they're within 5 feet of each other.`,
      tags: ["cantrip","damage","acid","save"]
    },
    {
      title: "Absorb Elements",
      level: 1, school: "Abjuration",
      casting_time: "1 reaction",
      range: "Self",
      components: "V,S",
      duration: "1 round",
      concentration: false,
      classes: ["Artificer","Druid","Ranger","Sorcerer","Wizard"],
      body: `When you take acid, cold, fire, lightning, or thunder damage, use your reaction to gain resistance to that damage type until the start of your next turn. Additionally, the first time you hit with a melee attack on your next turn, the target takes an extra 1d6 damage of the triggering type.`,
      tags: ["reaction","defense","resistance","damage"]
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
      title: "Arcanist's Magic Aura",
      level: 2, school: "Illusion",
      casting_time: "1 action",
      range: "Touch",
      components: "V,S,M",
      duration: "24 hours",
      concentration: false,
      classes: ["Wizard"],
      body: `Mask or alter a creature's/object's magical signature (type, alignment aura, creature type, etc.) for divinations/detection.`,
      tags: ["utility","stealth","divination-counter"]
    },
    {
      title: "Armor of Agathys",
      level: 1, school: "Abjuration",
      casting_time: "1 action",
      range: "Self",
      components: "V,S,M",
      duration: "1 hour",
      concentration: false,
      classes: ["Warlock"],
      body: `You gain temporary hit points and magical frost armor. Any creature that hits you with a melee attack while you have these temporary hit points takes cold damage equal to the temporary HP gained.`,
      tags: ["buff","temp hp","damage","cold","retaliation"]
    },
    {
      title: "Arms of Hadar",
      level: 1, school: "Conjuration",
      casting_time: "1 action",
      range: "Self (10-foot radius)",
      components: "V,S",
      duration: "Instantaneous",
      concentration: false,
      classes: ["Warlock"],
      body: `Dark tentacles erupt in a 10-foot radius. Each creature in the area must make a Strength saving throw or take necrotic damage and be unable to take reactions until the start of its next turn.`,
      tags: ["damage","necrotic","aoe","control"]
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
      title: "Aura of Life",
      level: 4, school: "Abjuration",
      casting_time: "1 action",
      range: "Self (30-foot radius)",
      components: "V",
      duration: "Up to 10 minutes",
      concentration: true,
      classes: ["Paladin"],
      body: `Life-preserving energy radiates from you in a 30-foot aura. Allies in the aura have resistance to necrotic damage, their hit point maximum can't be reduced, and any ally that starts their turn with 0 hit points regains 1 hit point.`,
      tags: ["aura","buff","healing","necrotic resistance","concentration"]
    },
    {
      title: "Aura of Purity",
      level: 4, school: "Abjuration",
      casting_time: "1 action",
      range: "Self (30-foot radius)",
      components: "V",
      duration: "Up to 10 minutes",
      concentration: true,
      classes: ["Paladin"],
      body: `Purifying energy radiates from you in a 30-foot aura. You and friendly creatures in the aura have resistance to poison damage and advantage on saving throws against being poisoned, diseased, blinded, deafened, paralyzed, and stunned.`,
      tags: ["aura","buff","resistance","condition protection","concentration"]
    },
    {
      title: "Aura of Vitality",
      level: 3, school: "Evocation",
      casting_time: "1 action",
      range: "Self (30-foot radius)",
      components: "V",
      duration: "Up to 1 minute",
      concentration: true,
      classes: ["Cleric","Paladin"],
      body: `Healing energy radiates from you in a 30-foot aura. On each of your turns, you can use a bonus action to cause one creature in the aura (including yourself) to regain 2d6 hit points.`,
      tags: ["aura","healing","bonus action","concentration"]
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
    title: "Banishing Smite",
    level: 5, school: "Abjuration",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Paladin"],
    body: `The next time you hit a creature with a weapon attack before this spell ends, your weapon crackles with force and the attack deals an extra 5d10 force damage. If the attack reduces the target to 50 hit points or fewer, you banish it. If the target is native to a different plane, it returns there. Otherwise, it's sent to a harmless demiplane until the spell ends.`,
    tags: ["smite","damage","force","banish","concentration"]
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
    title: "Beast Bond",
    level: 1, school: "Divination",
    casting_time: "1 action",
    range: "Touch",
    components: "V,S,M",
    duration: "Up to 10 minutes",
    concentration: true,
    classes: ["Druid","Ranger"],
    body: `You establish a telepathic link with one willing beast you touch. Until the spell ends, the link is active while you and the beast are within line of sight of each other. Through the link, the beast can understand your telepathic messages, and it can telepathically communicate simple emotions and concepts back to you. The beast has advantage on attack rolls against any creature within 5 feet of you that you can see.`,
    tags: ["beast","telepathy","buff","concentration"]
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
    title: "Blade of Disaster",
    level: 9, school: "Conjuration",
    casting_time: "1 bonus action",
    range: "60 ft",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `Create a blade of dark energy. As a bonus action, move it 30ft and attack with it. On hit: 4d12 force damage with crit on 18-20.`,
    tags: ["damage","force","bonus action","attack","critical"]
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
    title: "Booming Blade",
    level: 0, school: "Evocation",
    casting_time: "1 action",
    range: "Self (5-foot radius)",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Artificer","Sorcerer","Warlock","Wizard"],
    body: `You brandish the weapon used in the spell's casting and make a melee attack with it against one creature within 5 feet of you. On a hit, the target suffers the weapon attack's normal effects and becomes sheathed in booming energy until the start of your next turn. If the target willingly moves 5 feet or more before then, the target takes 1d8 thunder damage, and the spell ends. At higher levels, both the initial damage and the movement damage increase.`,
    tags: ["cantrip","damage","thunder","melee","attack","control"]
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
    body: `Your form shimmers; creatures have disadvantage on attack rolls against you unless they ignore illusions or can't see you anyway.`,
    tags: ["defense","disadvantage to hit","self-buff"]
  },
  {
    title: "Bones of the Earth",
    level: 6, school: "Transmutation",
    casting_time: "1 action",
    range: "120 ft",
    components: "V,S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Druid"],
    body: `You cause up to six pillars of stone to burst from places on the ground that you can see within range. Each pillar is a cylinder that has a diameter of 5 feet and a height of up to 30 feet. The ground where a pillar appears must be wide enough for its diameter, and you can target ground under a creature if that creature is Medium or smaller. Each pillar has AC 5 and 30 hit points. If a pillar is created under a creature, that creature must succeed on a Dexterity saving throw or be lifted by the pillar. A creature can choose to fail the save. If a pillar is prevented from reaching its full height because of a ceiling or other obstacle, a creature on the pillar takes 6d6 bludgeoning damage and is restrained, pinched between the pillar and the obstacle. The restrained creature can use an action to make a Strength or Dexterity check against the spell's save DC. On a success, the creature is no longer restrained and must either move off the pillar or fall off it.`,
    tags: ["control","terrain","damage","bludgeoning"]
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
    title: "Catapult",
    level: 1, school: "Transmutation",
    casting_time: "1 action",
    range: "60 ft",
    components: "S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Artificer","Sorcerer","Wizard"],
    body: `Choose an unattended object weighing 1 to 5 pounds within range and fling it toward a creature. The target must make a Dexterity saving throw, taking 3d8 bludgeoning damage on a failed save, or half as much on a success. The object flies in a straight line up to 90 feet before falling. If it hits a solid surface, the object and any creature in its path take damage.`,
    tags: ["damage","dexterity save","object"]
  },
  {
    title: "Cause Fear",
    level: 1, school: "Necromancy",
    casting_time: "1 action",
    range: "60 ft",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Warlock","Wizard"],
    body: `Target must succeed Wis save or become frightened for duration. Can repeat save at end of each turn.`,
    tags: ["control","frightened","save","debuff"]
  },
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
    title: "Catnap",
    level: 3, school: "Enchantment",
    casting_time: "1 action",
    range: "30 ft",
    components: "S,M",
    duration: "10 minutes",
    concentration: false,
    classes: ["Artificer","Bard","Sorcerer","Wizard"],
    body: `You make a calming gesture, and up to three willing creatures of your choice that you can see within range fall unconscious for 10 minutes. The spell ends early on a creature if it takes damage or someone uses an action to shake or slap it awake. When the spell ends, each affected creature gains the benefits of a short rest, and can't be affected by this spell again until they finish a long rest.`,
    tags: ["utility","healing","rest","party"]
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
    title: "Ceremony",
    level: 1, school: "Abjuration (ritual)",
    casting_time: "1 hour",
    range: "Touch",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Cleric","Paladin"],
    body: `You perform a special religious ceremony. Choose one: Atonement (remove effect that changed alignment), Bless Water (create holy water), Coming of Age (+1 AC for 24 hours), Funeral Rite (corpse can't become undead), Wedding (AC and save bonus for 7 days), or Investiture (detect lies about loyalty).`,
    tags: ["ritual","utility","blessing","social"]
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
    title: "Circle of Power",
    level: 5, school: "Abjuration",
    casting_time: "1 action",
    range: "Self (30-foot radius)",
    components: "V",
    duration: "Up to 10 minutes",
    concentration: true,
    classes: ["Paladin"],
    body: `Divine energy radiates from you in a 30-foot radius. For the duration, you and friendly creatures in the area have advantage on saving throws against spells and other magical effects. Additionally, when an affected creature succeeds on a saving throw against a spell or magical effect that allows a save to take only half damage, it instead takes no damage.`,
    tags: ["aura","buff","magic resistance","concentration"]
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
    body: `Creates an invisible sensor at a known or described location you've seen or can specify. You can switch between seeing and hearing through the sensor, which can't move.`
  },
  {
    title: "Cloud of Daggers",
    level: 2, school: "Conjuration",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    body: `You fill the air with spinning daggers in a 5-foot cube centered on a point within range. A creature takes 4d4 slashing damage when it enters the spell's area for the first time on a turn or starts its turn there.`,
    tags: ["damage","area","slashing","concentration"]
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
    title: "Conjure Barrage",
    level: 3, school: "Conjuration",
    casting_time: "1 action",
    range: "Self (60-foot cone)",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Ranger"],
    body: `You throw a nonmagical weapon or fire a piece of nonmagical ammunition into the air to create a cone of identical weapons that shoot forward and then disappear. Each creature in the 60-foot cone must make a Dexterity saving throw, taking 3d8 damage on a failed save or half as much on a success. The damage type is the same as the weapon or ammunition used.`,
    tags: ["damage","aoe","cone","weapon"]
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
    title: "Conjure Volley",
    level: 5, school: "Conjuration",
    casting_time: "1 action",
    range: "150 ft",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Ranger"],
    body: `You fire a piece of nonmagical ammunition from a ranged weapon or throw a nonmagical weapon into the air and choose a point within range. Hundreds of duplicates rain down in a 40-foot-radius, 20-foot-high cylinder centered on that point. Each creature in the area must make a Dexterity saving throw, taking 8d8 damage on a failed save or half as much on a success. The damage type is the same as the weapon or ammunition used.`,
    tags: ["damage","aoe","weapon","cylinder"]
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
    title: "Conjure Woodland Beings",
    level: 4, school: "Conjuration",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Druid","Ranger"],
    body: `You summon fey creatures that appear in unoccupied spaces you can see within range. Choose one of the following options for what appears: one fey creature of CR 2 or lower, two fey creatures of CR 1 or lower, four fey creatures of CR 1/2 or lower, or eight fey creatures of CR 1/4 or lower. The DM has the creatures' statistics. The summoned creatures are friendly to you and your companions and act on their own initiative. They obey your verbal commands.`,
    tags: ["summon","fey","allies","concentration"]
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
    title: "Control Flames",
    level: 0, school: "Transmutation",
    casting_time: "1 action",
    range: "60 ft",
    components: "S",
    duration: "Instantaneous or 1 hour",
    concentration: false,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `You choose nonmagical flame that you can see within range and that fits within a 5-foot cube. You affect it in one of the following ways: expand/extinguish the flame, change its brightness, or create simple shapes that last 1 hour.`,
    tags: ["cantrip","utility","fire","control"]
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
    title: "Control Winds",
    level: 5, school: "Transmutation",
    casting_time: "1 action",
    range: "300 ft",
    components: "V,S",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `You take control of the air in a 100-foot cube within range. Choose one of the following effects when you cast the spell: gusts (push creatures and objects), downdraft (impose disadvantage on ranged attacks and flying), or updraft (grant advantage on jumping and half falling damage). As an action, you can switch between effects. Creatures in strong wind have disadvantage on ranged weapon attack rolls and Perception checks that rely on hearing. Strong wind extinguishes open flames and disperses fog.`,
    tags: ["control","concentration","battlefield","environment","wind"]
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
    body: `Interrupt a creature casting a spell. If the spell's level is within your counter threshold it fails; otherwise make an ability check to stop it.`
  },
  {
    title: "Create Bonfire",
    level: 0, school: "Conjuration",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Artificer","Druid","Sorcerer","Warlock","Wizard"],
    body: `You create a bonfire on ground that you can see within range. Until the spell ends, the bonfire fills a 5-foot cube. Any creature in the bonfire's space when you cast the spell must succeed on a Dexterity saving throw or take 1d8 fire damage. A creature must also make the saving throw when it enters the bonfire's space for the first time on a turn or ends its turn there. The damage increases when you reach higher levels.`,
    tags: ["cantrip","damage","fire","area","save","concentration"]
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
    title: "Crown of Madness",
    level: 2, school: "Enchantment",
    casting_time: "1 action",
    range: "120 ft",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    body: `One humanoid you can see within range must succeed on a Wisdom saving throw or become charmed by you for the duration. While charmed, a twisted crown of jagged iron appears on its head. The charmed target must use its action before moving on each of its turns to make a melee attack against a creature other than itself that you mentally choose. The target can act normally if you choose no creature or if none are within its reach.`,
    tags: ["charm","control","concentration","save"]
  },
  {
    title: "Crown of Stars",
    level: 7, school: "Evocation",
    casting_time: "1 action",
    range: "Self",
    components: "V,S",
    duration: "1 hour",
    concentration: false,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `Seven star-like motes of light appear and orbit your head until the spell ends. You can use a bonus action to send one mote streaking toward one creature or object within 120 feet. When you do so, make a ranged spell attack. On a hit, the target takes 4d12 radiant damage. Whether you hit or miss, the mote is expended.`,
    tags: ["damage","radiant","bonus action","long duration"]
  },
  {
    title: "Crusader's Mantle",
    level: 3, school: "Evocation",
    casting_time: "1 action",
    range: "Self (30-foot radius)",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Paladin"],
    body: `Holy power radiates from you in a 30-foot radius, awakening boldness in friendly creatures. Until the spell ends, the aura moves with you, centered on you. Each nonhostile creature in the aura (including you) deals an extra 1d4 radiant damage when it hits with a weapon attack.`,
    tags: ["aura","damage","radiant","buff","concentration"]
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
    body: "Magical darkness fills a large area; nonmagical light can't illuminate it and darkvision can't see through it. If cast on an object, the darkness moves with it."
  },
  {
    title: "Danse Macabre",
    level: 5, school: "Necromancy",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Warlock","Wizard"],
    body: `Threads of dark power leap from your fingers to pierce up to five Small or Medium corpses you can see within range. Each corpse immediately stands up and becomes undead, using the zombie or skeleton stat block (your choice). On each of your turns, you can use a bonus action to mentally command any creatures you made with this spell if they are within 60 feet of you. You decide what action the creatures will take and where they will move. If you don't issue commands, they defend themselves.`,
    tags: ["summon","undead","necromancy","concentration"]
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
    body: "Shape a target's dreams and communicate across any distance on the same plane. You can appear monstrous to inflict psychic harm if the target fails a save."
  },
  {
    title: "Dragon's Breath",
    level: 2, school: "Transmutation",
    casting_time: "1 bonus action",
    range: "Touch",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Sorcerer","Wizard"],
    body: `Touch willing creature. Until spell ends, creature can use action to exhale 15ft cone of elemental energy (acid/cold/fire/lightning/poison). Dex save or 3d6 damage.`,
    tags: ["buff","damage","bonus action","elemental"]
  },
  {
    title: "Dream of the Blue Veil",
    level: 7, school: "Conjuration",
    casting_time: "10 minutes",
    range: "20 ft",
    components: "V,S,M",
    duration: "6 hours",
    concentration: false,
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    body: `You and up to 8 willing creatures fall asleep. If target linked object from another world, you all wake on that world.`,
    tags: ["utility","travel","teleportation","ritual"]
  },
  {
    title: "Druid Grove",
    level: 6, school: "Abjuration",
    casting_time: "10 minutes",
    range: "Touch",
    components: "V,S,M",
    duration: "24 hours",
    concentration: false,
    classes: ["Druid"],
    body: `Ward 90ft cube. Effects: solid fog, gust of wind, spike growth, difficult terrain transformed, others.`,
    tags: ["area control","ward","terrain","utility"]
  },
  {
    title: "Dust Devil",
    level: 2, school: "Conjuration",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `Create 5ft diameter, 30ft tall cylinder whirlwind. Str save or 1d8 bludgeoning + pushed 10ft. Bonus action to move 30ft.`,
    tags: ["damage","control","area","bonus action"]
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
    title: "Earthbind",
    level: 2, school: "Transmutation",
    casting_time: "1 action",
    range: "300 ft",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Druid","Sorcerer","Warlock","Wizard"],
    body: `Choose one creature you can see within range. Yellow bands of magical energy loop around the creature. The target must succeed on a Strength saving throw or its flying speed (if any) is reduced to 0 feet for the spell's duration. An airborne creature affected by this spell descends at 60 feet per round until it reaches the ground or the spell ends.`,
    tags: ["control","movement","save","concentration"]
  },
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
    title: "Elemental Bane",
    level: 4, school: "Transmutation",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Artificer","Druid","Warlock","Wizard"],
    body: `Choose one creature you can see within range, and choose one of the following damage types: acid, cold, fire, lightning, or thunder. The target must succeed on a Constitution saving throw or be affected by the spell for its duration. The first time each turn the affected target takes damage of the chosen type, it takes an extra 2d6 damage of that type. The target also loses any resistance to that damage type until the spell ends.`,
    tags: ["debuff","damage","vulnerability","concentration"]
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
    title: "Enemies Abound",
    level: 3, school: "Enchantment",
    casting_time: "1 action",
    range: "120 ft",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    body: `Target must succeed Int save or see all creatures as enemies and attack nearest. Can repeat save each turn if damaged.`,
    tags: ["control","debuff","save","charm"]
  },
  {
    title: "Enlarge Reduce",
    level: 2, school: "Transmutation", concentration: true,
    casting_time: "1 action", range: "30 ft", components: "V, S, M (powdered iron)",
    duration: "Up to 1 minute (Concentration)",
    classes: ["Sorcerer","Wizard"],
    tags: ["buff","debuff","size"],
    body: "Change a creature or object's size. Enlarge doubles its dimensions and adds damage; Reduce halves its dimensions and imposes disadvantage on Strength checks and saves."
  },
  {
    title: "Enervation",
    level: 5, school: "Necromancy",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `A tendril of inky darkness reaches out from you, touching a creature you can see within range to drain life. The target must make a Dexterity saving throw. On a success, the target takes 2d8 necrotic damage, and the spell ends. On a failed save, the target takes 4d8 necrotic damage, and until the spell ends, you can use your action on each of your turns to automatically deal 4d8 necrotic damage to the target. The spell ends if you use your action to do anything else, if the target is ever outside the spell's range, or if the target has total cover. Whenever the spell deals damage, you regain hit points equal to half the amount of necrotic damage dealt.`,
    tags: ["damage","necrotic","healing","concentration"]
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
    title: "Erupting Earth",
    level: 3, school: "Transmutation",
    casting_time: "1 action",
    range: "120 ft",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `Choose point. Ground erupts in 20ft cube. Creatures make Dex save or take 3d12 bludgeoning and area becomes difficult terrain.`,
    tags: ["damage","area","terrain","save"]
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
    title: "Far Step",
    level: 5, school: "Conjuration",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `You teleport up to 60 feet to an unoccupied space you can see. On each of your turns before the spell ends, you can use a bonus action to teleport in this way again.`,
    tags: ["teleportation","mobility","bonus action","concentration"]
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
    title: "Find Greater Steed",
    level: 4, school: "Conjuration",
    casting_time: "10 minutes",
    range: "30 ft",
    components: "V,S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Paladin"],
    body: `You summon a spirit that assumes the form of a loyal, majestic mount. The creature appears in an unoccupied space within range and takes a form you choose: a griffon, a pegasus, a peryton, a dire wolf, a rhinoceros, or a saber-toothed tiger. The creature has the statistics provided in the Monster Manual for the chosen form, though it is a celestial, a fey, or a fiend (your choice) instead of its normal creature type. Your mount serves you as a companion and has an Intelligence score of at least 6. You have an instinctive bond with it that allows you to fight as a seamless unit.`,
    tags: ["summon","mount","companion"]
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
    title: "Flame Arrows",
    level: 3, school: "Transmutation",
    casting_time: "1 action",
    range: "Touch",
    components: "V,S",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Artificer","Druid","Ranger","Sorcerer","Wizard"],
    body: `You touch a quiver containing arrows or bolts. When a target is hit by a ranged weapon attack using a piece of ammunition drawn from the quiver, the target takes an extra 1d6 fire damage. The spell's magic ends on a piece of ammunition when it hits or misses, and the spell ends when twelve pieces of ammunition have been drawn from the quiver.`,
    tags: ["buff","damage","fire","weapon","concentration"]
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
  {
    title: "Frostbite",
    level: 0, school: "Evocation",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Artificer","Druid","Sorcerer","Warlock","Wizard"],
    body: `You cause numbing frost to form on one creature that you can see within range. The target must make a Constitution saving throw. On a failed save, the target takes 1d6 cold damage, and it has disadvantage on the next weapon attack roll it makes before the end of its next turn. The spell's damage increases by 1d6 when you reach higher levels.`,
    tags: ["cantrip","damage","cold","save","debuff"]
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
    title: "Grasping Vine",
    level: 4, school: "Conjuration",
    casting_time: "1 bonus action",
    range: "30 ft",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Druid","Ranger"],
    body: `You conjure a vine that sprouts from the ground in an unoccupied space you can see within range. When you cast this spell, you can direct the vine to lash out at a creature within 30 feet of it that you can see. That creature must make a Dexterity saving throw or be pulled 20 feet directly toward the vine. Until the spell ends, you can direct the vine to lash out at the same creature or another one as a bonus action on each of your turns.`,
    tags: ["control","movement","bonus action","concentration"]
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
    title: "Green-Flame Blade",
    level: 0, school: "Evocation",
    casting_time: "1 action",
    range: "Self (5-foot radius)",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Artificer","Sorcerer","Warlock","Wizard"],
    body: `You brandish the weapon used in the spell's casting and make a melee attack with it against one creature within 5 feet of you. On a hit, the target suffers the weapon attack's normal effects, and you can cause green fire to leap from the target to a different creature of your choice that you can see within 5 feet of it. The second creature takes fire damage equal to your spellcasting ability modifier. At higher levels, both the initial and splash damage increase.`,
    tags: ["cantrip","damage","fire","melee","attack"]
  },
  {
    title: "Gust",
    level: 0, school: "Transmutation",
    casting_time: "1 action",
    range: "30 ft",
    components: "V,S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `You seize the air and compel it to create one of the following effects at a point you can see within range: push a Medium or smaller creature 5 feet away from you (Strength save); push an object up to 5 pounds that isn't being worn or carried; or create a harmless sensory effect like a shower of leaves or a gust of wind.`,
    tags: ["cantrip","control","utility","wind"]
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
    title: "Guardian of Nature",
    level: 4, school: "Transmutation",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Druid","Ranger"],
    body: `A nature spirit answers your call and transforms you into a powerful guardian. Choose one of the following forms: Primal Beast (gain temp HP, bonus to Str checks/saves, speed bonus, melee weapon attacks deal extra force damage) or Great Tree (gain temp HP, advantage on Con saves, bonus to AC and Dex saves, your attacks treat all weapon damage as force damage and gain reach). The transformation lasts until the spell ends.`,
    tags: ["buff","transformation","concentration","bonus action"]
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
    title: "Hail of Thorns",
    level: 1, school: "Conjuration",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Ranger"],
    body: `Next time you hit with ranged weapon attack, target and all within 5ft make Dex save or take 1d10 piercing.`,
    tags: ["damage","bonus action","area","ranger"]
  },
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
    title: "Healing Spirit",
    level: 2, school: "Conjuration",
    casting_time: "1 bonus action",
    range: "60 ft",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Druid","Ranger"],
    body: `You call forth a nature spirit to soothe the wounded. The spirit appears in a 5-foot cube in a space you can see within range. Each creature you choose that starts its turn in the spirit's space or moves into it for the first time on a turn regains hit points equal to 1d6. The spirit can heal up to six times total before disappearing. As a bonus action, you can move the spirit up to 30 feet to a space you can see.`,
    tags: ["healing","bonus action","concentration","summon"]
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
    title: "Hex",
    level: 1, school: "Enchantment",
    casting_time: "1 bonus action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Warlock"],
    body: `You place a curse on a creature that you can see within range. Until the spell ends, you deal an extra 1d6 necrotic damage to the target whenever you hit it with an attack. Also, choose one ability when you cast the spell. The target has disadvantage on ability checks made with the chosen ability. If the target drops to 0 hit points before this spell ends, you can use a bonus action on a subsequent turn to curse a new creature.`,
    tags: ["damage","necrotic","debuff","bonus action","concentration"]
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
    title: "Hunger of Hadar",
    level: 3, school: "Conjuration",
    casting_time: "1 action",
    range: "150 ft",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Warlock"],
    body: `You open a gateway to the dark between the stars, a region infested with unknown horrors. A 20-foot-radius sphere of blackness and bitter cold appears, centered on a point within range and lasting for the duration. The sphere is difficult terrain, and it is filled with cacophonous whispers. Any creature that starts its turn in the area takes 2d6 cold damage. Any creature that ends its turn there must make a Dexterity saving throw or take 2d6 acid damage as milky, otherworldly tentacles rub against it. The void creates an area of magical darkness.`,
    tags: ["damage","cold","acid","area","darkness","concentration"]
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
  // ===== I =====
  {
    title: "Ice Knife",
    level: 1, school: "Conjuration",
    casting_time: "1 action",
    range: "60 ft",
    components: "S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `Ranged spell attack. On hit: 1d10 piercing. Hit or miss: shards explode 5ft radius, Dex save or 2d6 cold.`,
    tags: ["damage","piercing","cold","attack","area"]
  },
  {
    title: "Identify",
    level: 1, school: "Divination (ritual)",
    casting_time: "1 minute",
    range: "Touch",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Artificer","Bard","Wizard"],
    body: `You learn the properties of a magic item or spell affecting an object or creature. You learn its functions, how to use it, whether it requires attunement, how many charges it has (if any), and what spells are affecting it. If you touch a creature, you learn what spells are currently affecting it.`,
    tags: ["ritual","utility","detection","magic items"]
  },
  {
    title: "Imprisonment",
    level: 9, school: "Abjuration",
    casting_time: "1 minute",
    range: "30 ft",
    components: "V,S,M",
    duration: "Until dispelled",
    concentration: false,
    classes: ["Warlock","Wizard"],
    body: `You create a magical restraint to hold a creature that you can see within range. The target must make a Wisdom saving throw. On a success, it is unaffected. On a failed save, it is imprisoned. You must choose one of six forms of imprisonment: Burial (entombed deep beneath the earth), Chaining (bound by chains), Hedged Prison (trapped in a demiplane), Minimus Containment (shrunk to one inch and trapped in a gem), Slumber (unconscious sleep), or Ending (buried at the bottom of the ocean or similar). Dispel magic can't end this spell, but certain conditions can.`,
    tags: ["control","high-level","imprisonment"]
  },
  {
    title: "Infernal Calling",
    level: 5, school: "Conjuration",
    casting_time: "1 minute",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Warlock","Wizard"],
    body: `You summon a devil from the Nine Hells. The devil appears in an unoccupied space you can see within range. You must make a Charisma check contested by its Charisma check. If you win, the devil serves you for the duration. If you lose, it is free and hostile. The devil acts on its own initiative and follows your commands as best it can. When the spell ends, the creature returns to its home plane.`,
    tags: ["summon","devil","fiend","concentration"]
  },
  {
    title: "Infestation",
    level: 0, school: "Conjuration",
    casting_time: "1 action",
    range: "30 ft",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Druid","Sorcerer","Warlock","Wizard"],
    body: `You cause mites, fleas, and other parasites to appear momentarily on one creature you can see within range. The target must succeed on a Constitution saving throw, or it takes 1d6 poison damage and moves 5 feet in a random direction if it can move and its speed is at least 5 feet. Roll a d4 for the direction: 1, north; 2, south; 3, east; or 4, west. This movement doesn't provoke opportunity attacks, and if the direction rolled is blocked, the target doesn't move. The spell's damage increases when you reach higher levels.`,
    tags: ["cantrip","damage","poison","save","control"]
  },
  {
    title: "Invisibility",
    level: 2, school: "Illusion",
    casting_time: "1 action",
    range: "Touch",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Artificer","Bard","Sorcerer","Warlock","Wizard"],
    body: `A creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it is on the target's person. The spell ends for a target that attacks or casts a spell.`,
    tags: ["buff","invisibility","stealth","concentration"]
  },
  {
    title: "Intellect Fortress",
    level: 3, school: "Abjuration",
    casting_time: "1 action",
    range: "30 ft",
    components: "V",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Artificer","Bard","Sorcerer","Warlock","Wizard"],
    body: `You and chosen creatures gain resistance to psychic damage and advantage on Int/Wis/Cha saves.`,
    tags: ["buff","defense","resistance","save"]
  },
  {
    title: "Investiture of Flame",
    level: 6, school: "Transmutation",
    casting_time: "1 action",
    range: "Self",
    components: "V,S",
    duration: "Up to 10 minutes",
    concentration: true,
    classes: ["Druid","Sorcerer","Warlock","Wizard"],
    body: `Immunity to fire, resistance to cold, 1d10 fire to creatures within 5ft, action to cast 15ft line dealing 4d8 fire.`,
    tags: ["buff","fire","damage","immunity","resistance"]
  },
  {
    title: "Investiture of Ice",
    level: 6, school: "Transmutation",
    casting_time: "1 action",
    range: "Self",
    components: "V,S",
    duration: "Up to 10 minutes",
    concentration: true,
    classes: ["Druid","Sorcerer","Warlock","Wizard"],
    body: `Immunity to cold, resistance to fire, move over ice without penalty, freeze water, action to create 15ft cone 4d6 cold.`,
    tags: ["buff","cold","damage","immunity","resistance","terrain"]
  },
  {
    title: "Investiture of Stone",
    level: 6, school: "Transmutation",
    casting_time: "1 action",
    range: "Self",
    components: "V,S",
    duration: "Up to 10 minutes",
    concentration: true,
    classes: ["Druid","Sorcerer","Warlock","Wizard"],
    body: `Resistance to nonmagical damage, move through earth/stone, action to cause Con save or knocked prone.`,
    tags: ["buff","defense","resistance","terrain","control"]
  },
  {
    title: "Investiture of Wind",
    level: 6, school: "Transmutation",
    casting_time: "1 action",
    range: "Self",
    components: "V,S",
    duration: "Up to 10 minutes",
    concentration: true,
    classes: ["Druid","Sorcerer","Warlock","Wizard"],
    body: `Ranged attacks disadvantage against you, fly 60ft, ranged attacks, action to create 15ft cube wind pushing creatures.`,
    tags: ["buff","mobility","defense","control","flying"]
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
    title: "Life Transference",
    level: 3, school: "Necromancy",
    casting_time: "1 action",
    range: "30 ft",
    components: "V,S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Bard","Cleric","Wizard"],
    body: `Take 4d8 necrotic damage (ignores resistance). Target heals twice that amount.`,
    tags: ["healing","damage","necrotic","sacrifice"]
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
    title: "Lightning Arrow",
    level: 3, school: "Transmutation",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Ranger"],
    body: `The next time you make a ranged weapon attack during the spell's duration, the weapon's ammunition (or the weapon itself if it's a thrown weapon) transforms into a bolt of lightning. Make the attack roll as normal. The target takes 4d8 lightning damage on a hit, or half as much on a miss. Whether you hit or miss, each creature within 10 feet of the target must make a Dexterity saving throw, taking 2d8 lightning damage on a failed save or half as much on a success.`,
    tags: ["damage","lightning","weapon","bonus action","concentration"]
  },
  {
    title: "Lightning Lure",
    level: 0, school: "Evocation",
    casting_time: "1 action",
    range: "Self (15-foot radius)",
    components: "V",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Artificer","Sorcerer","Warlock","Wizard"],
    body: `You create a lash of lightning energy that strikes at one creature of your choice that you can see within 15 feet of you. The target must succeed on a Strength saving throw or be pulled up to 10 feet in a straight line toward you and then take 1d8 lightning damage if it is within 5 feet of you. The spell's damage increases when you reach higher levels.`,
    tags: ["cantrip","damage","lightning","save","control"]
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
    title: "Magnify Gravity",
    level: 1, school: "Transmutation",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S",
    duration: "1 round",
    concentration: false,
    classes: ["Wizard"],
    body: `10ft radius sphere. Str save or 2d8 force + pulled 10ft toward center. Area is difficult terrain until spell ends.`,
    tags: ["damage","force","control","area","terrain"]
  },
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
    title: "Magic Stone",
    level: 0, school: "Transmutation",
    casting_time: "1 bonus action",
    range: "Touch",
    components: "V,S",
    duration: "1 minute",
    concentration: false,
    classes: ["Artificer","Druid","Warlock"],
    body: `You touch one to three pebbles and imbue them with magic. You or someone else can make a ranged spell attack with one of the pebbles by throwing it or hurling it with a sling. If thrown, a pebble has a range of 60 feet. If someone else attacks with a pebble, they add your spellcasting ability modifier, not the attacker's, to the attack roll. On a hit, the target takes bludgeoning damage equal to 1d6 + your spellcasting ability modifier. Whether the attack hits or misses, the spell then ends on the stone.`,
    tags: ["cantrip","damage","attack","bludgeoning","bonus action"]
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
    title: "Maddening Darkness",
    level: 8, school: "Evocation",
    casting_time: "1 action",
    range: "150 ft",
    components: "V,M",
    duration: "Up to 10 minutes",
    concentration: true,
    classes: ["Warlock","Wizard"],
    body: `Magical darkness spreads from a point within range to fill a 60-foot-radius sphere until the spell ends. The darkness spreads around corners. Darkvision can't penetrate it, and no natural light can illuminate it. Shrieks, gibbering, and mad laughter can be heard in the sphere. Whenever a creature starts its turn in the sphere, it must make a Wisdom saving throw, taking 8d8 psychic damage on a failed save or half as much on a success.`,
    tags: ["damage","psychic","darkness","area","concentration"]
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
    body: "You and your equipment merge with a solid stone surface. You remain aware of surroundings but can't move or act while inside."
  },
  {
    title: "Melf's Minute Meteors",
    level: 3, school: "Evocation",
    casting_time: "1 action",
    range: "Self",
    components: "V,S,M",
    duration: "Up to 10 minutes",
    concentration: true,
    classes: ["Sorcerer","Wizard"],
    body: `Create 6 tiny meteors. Bonus action to shoot 1 or 2 up to 120ft. Ranged spell attack dealing 2d6 fire each.`,
    tags: ["damage","fire","bonus action","attack","concentration"]
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
    title: "Mental Prison",
    level: 6, school: "Illusion",
    casting_time: "1 action",
    range: "60 ft",
    components: "S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `You attempt to bind a creature within an illusory cell that only it perceives. One creature you can see within range must make an Intelligence saving throw. On a success, the spell has no effect. On a failed save, the creature takes 5d10 psychic damage and is restrained for the duration. If the target moves more than 10 feet from where it was when you cast the spell, it takes 10d10 psychic damage and the spell ends.`,
    tags: ["damage","psychic","control","restrained","concentration"]
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
    title: "Mighty Fortress",
    level: 8, school: "Conjuration",
    casting_time: "1 minute",
    range: "1 mile",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Wizard"],
    body: `Create permanent 120ft square stone fortress with towers, battlements, gate, arrow slits.`,
    tags: ["utility","structure","fortification","permanent"]
  },
  {
    title: "Mind Sliver",
    level: 0, school: "Enchantment",
    casting_time: "1 action",
    range: "60 ft",
    components: "V",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `You drive a disorienting spike of psychic energy into the mind of one creature you can see within range. The target must succeed on an Intelligence saving throw or take 1d6 psychic damage and subtract 1d4 from the next saving throw it makes before the end of your next turn. The spell's damage increases when you reach higher levels.`,
    tags: ["cantrip","damage","psychic","save","debuff"]
  },
  {
    title: "Mind Spike",
    level: 2, school: "Divination",
    casting_time: "1 action",
    range: "60 ft",
    components: "S",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `Target makes Wis save or takes 3d8 psychic. You know target's location while spell lasts.`,
    tags: ["damage","psychic","divination","tracking","concentration"]
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
    body: "You reshape a creature's memory of an event within the last 24 hours, up to 10 minutes long. They must fail a Wisdom saving throw to be affected."
  },
  {
    title: "Mold Earth",
    level: 0, school: "Transmutation",
    casting_time: "1 action",
    range: "30 ft",
    components: "S",
    duration: "Instantaneous or 1 hour",
    concentration: false,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `You choose a portion of dirt or stone that you can see within range and that fits within a 5-foot cube. You manipulate it in one of the following ways: excavate it and move it up to 5 feet; cause shapes, colors, or both to appear on the dirt or stone, spelling out words or creating images (lasts 1 hour); cause the ground to become difficult terrain or normal terrain (lasts 1 hour). If you cast this spell multiple times, you can have no more than two of its non-instantaneous effects active at a time.`,
    tags: ["cantrip","utility","earth","terrain"]
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
    title: "Negative Energy Flood",
    level: 5, school: "Necromancy",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Warlock","Wizard"],
    body: `You send ribbons of negative energy at one creature you can see within range. The target must make a Constitution saving throw. On a failed save, it takes 5d12 necrotic damage and you regain hit points equal to half the necrotic damage dealt. If the target is a humanoid that is reduced to 0 hit points by this spell, it immediately rises as a zombie that follows your verbal commands.`,
    tags: ["damage","necrotic","healing","zombie","summon"]
  },
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
    title: "Primal Savagery",
    level: 0, school: "Transmutation",
    casting_time: "1 action",
    range: "Self",
    components: "S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Druid"],
    body: `You channel primal magic to cause your teeth or fingernails to sharpen, ready to deliver a corrosive attack. Make a melee spell attack against one creature within 5 feet of you. On a hit, the target takes 1d10 acid damage. After you make the attack, your teeth or fingernails return to normal. The spell's damage increases when you reach higher levels.`,
    tags: ["cantrip","damage","acid","melee","attack"]
  },
  {
    title: "Primordial Ward",
    level: 6, school: "Abjuration",
    casting_time: "1 action",
    range: "Self",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Druid"],
    body: `Gain resistance to acid, cold, fire, lightning, thunder.`,
    tags: ["buff","resistance","defense","elemental","concentration"]
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
    body: "A flame appears in your hand. It sheds light and can be thrown to deal 1d8 fire damage on a hit. The flame doesn't harm you or your equipment."
  },
  {
    title: "Psychic Scream",
    level: 9, school: "Enchantment",
    casting_time: "1 action",
    range: "90 ft",
    components: "S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    body: `You unleash the power of your mind to blast the intellect of up to ten creatures of your choice that you can see within range. Creatures with an Intelligence score of 2 or lower are unaffected. Each target must make an Intelligence saving throw. On a failed save, a target takes 14d6 psychic damage and is stunned. On a successful save, it takes half as much damage and isn't stunned. If a target is killed by this damage, its head explodes.`,
    tags: ["damage","psychic","stun","high-level"]
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
    title: "Pyrotechnics",
    level: 2, school: "Transmutation",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Artificer","Bard","Sorcerer","Wizard"],
    body: `Choose an area of nonmagical flame that you can see and fits within a 5-foot cube. You can extinguish the fire, or create fireworks (creatures within 10 feet must succeed on a Constitution saving throw or be blinded until the end of your next turn) or smoke (20-foot-radius sphere of thick smoke that heavily obscures the area for 1 minute).`,
    tags: ["utility","control","blind","smoke"]
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
    title: "Resurrection",
    level: 7, school: "Necromancy",
    casting_time: "1 hour",
    range: "Touch",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Bard","Cleric"],
    body: `You touch a dead creature that has been dead for no more than a century, that didn't die of old age, and that isn't undead. If its soul is free and willing, the target returns to life with all its hit points. This spell neutralizes any poisons and cures normal diseases afflicting the creature when it died. It closes all mortal wounds and restores any missing body parts. The spell can even provide a new body if the original no longer exists.`,
    tags: ["healing","revival","restoration"]
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
    title: "Scatter",
    level: 6, school: "Conjuration",
    casting_time: "1 action",
    range: "30 ft",
    components: "V",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `The air quivers around up to five creatures of your choice that you can see within range. An unwilling creature must succeed on a Wisdom saving throw to resist this spell. You teleport each affected target to an unoccupied space that you can see within 120 feet of you. That space must be on the ground or on a floor.`,
    tags: ["teleportation","control","battlefield"]
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
    title: "Searing Smite",
    level: 1, school: "Evocation",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Paladin"],
    body: `The next time you hit a creature with a melee weapon attack during the spell's duration, your weapon flares with white-hot intensity, and the attack deals an extra 1d6 fire damage. Additionally, the target must make a Constitution saving throw or be set ablaze. At the start of each of its turns until the spell ends, the creature takes 1d6 fire damage unless it uses an action to douse the flames.`,
    tags: ["smite","damage","fire","bonus action","concentration"]
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
    title: "Shadow Blade",
    level: 2, school: "Illusion",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `You weave together threads of shadow to create a sword of solidified gloom in your hand. This magic sword lasts until the spell ends. It counts as a simple melee weapon with which you are proficient. It deals 2d8 psychic damage on a hit and has the finesse, light, and thrown properties (range 20/60). In addition, when you use the sword to attack a target that is in dim light or darkness, you make the attack roll with advantage.`,
    tags: ["conjuration","weapon","psychic","damage","bonus action","concentration"]
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
    title: "Shape Water",
    level: 0, school: "Transmutation",
    casting_time: "1 action",
    range: "30 ft",
    components: "S",
    duration: "Instantaneous or 1 hour",
    concentration: false,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `You choose an area of water that you can see within range and that fits within a 5-foot cube. You manipulate it in one of the following ways: move or otherwise change the flow of the water; cause simple shapes to form in the water (lasts 1 hour); change the water's color or opacity (lasts 1 hour); freeze the water if there are no creatures in it (lasts 1 hour). If you cast this spell multiple times, you can have no more than two of its non-instantaneous effects active at a time.`,
    tags: ["cantrip","utility","water","control"]
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
    title: "Sickening Radiance",
    level: 4, school: "Evocation",
    casting_time: "1 action",
    range: "120 ft",
    components: "V,S",
    duration: "Up to 10 minutes",
    concentration: true,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `Dim, greenish light spreads within a 30-foot-radius sphere centered on a point you choose within range. The light spreads around corners, and it lasts until the spell ends. When a creature moves into the spell's area for the first time on a turn or starts its turn there, that creature must make a Constitution saving throw, taking 4d10 radiant damage on a failed save or half as much on a success. Additionally, the creature gains one level of exhaustion on a failed save.`,
    tags: ["damage","radiant","exhaustion","area","concentration"]
  },
  {
    title: "Skill Empowerment",
    level: 5, school: "Transmutation",
    casting_time: "1 action",
    range: "Touch",
    components: "V,S",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Artificer","Bard","Sorcerer","Wizard"],
    body: `Your magic deepens a creature's understanding of its own talent. You touch one willing creature and give it expertise in one skill of your choice; until the spell ends, the creature doubles its proficiency bonus for ability checks it makes that use the chosen skill.`,
    tags: ["buff","skill","utility","concentration"]
  },
  {
    title: "Skywrite",
    level: 2, school: "Transmutation (ritual)",
    casting_time: "1 action",
    range: "Sight",
    components: "V,S",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Artificer","Bard","Druid","Wizard"],
    body: `You cause up to ten words to form in a part of the sky you can see. The words appear to be made of cloud and remain in place for the spell's duration. The words dissipate when the spell ends. A strong wind can disperse the clouds and end the spell early.`,
    tags: ["ritual","utility","communication","concentration"]
  },
  {
    title: "Snare",
    level: 1, school: "Abjuration",
    casting_time: "1 minute",
    range: "Touch",
    components: "V,S,M",
    duration: "8 hours",
    concentration: false,
    classes: ["Artificer","Druid","Ranger","Wizard"],
    body: `As you cast this spell, you use rope to create a circle with a 5-foot radius on the ground or floor. When you finish casting, the rope disappears and the circle becomes a magic trap. This trap is nearly invisible, requiring a successful Intelligence (Investigation) check against your spell save DC to be discerned. The trap triggers when a Small, Medium, or Large creature moves into the area protected by the spell. That creature must succeed on a Dexterity saving throw or be magically hoisted into the air, leaving it hanging upside down 3 feet above the ground or floor. The creature is restrained there until the spell ends.`,
    tags: ["trap","control","utility"]
  },
  {
    title: "Snilloc's Snowball Swarm",
    level: 2, school: "Evocation",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Sorcerer","Wizard"],
    body: `A flurry of magic snowballs erupts from a point you choose within range. Each creature in a 5-foot-radius sphere centered on that point must make a Dexterity saving throw. A creature takes 3d6 cold damage on a failed save, or half as much damage on a successful one.`,
    tags: ["damage","cold","area","save"]
  },
  {
    title: "Soul Cage",
    level: 6, school: "Necromancy",
    casting_time: "1 reaction",
    range: "60 ft",
    components: "V,S,M",
    duration: "8 hours",
    concentration: false,
    classes: ["Warlock","Wizard"],
    body: `This spell snatches the soul of a humanoid as it dies and traps it inside a tiny cage. While you have a soul inside the cage, you can use it to gain benefits: you can steal life energy (regain hit points), ask questions, borrow their experience, or see through the soul's eyes.`,
    tags: ["necromancy","utility","heal","information"]
  },
  {
    title: "Staggering Smite",
    level: 4, school: "Evocation",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Paladin"],
    body: `The next time you hit a creature with a melee weapon attack during this spell's duration, your weapon pierces both body and mind, and the attack deals an extra 4d6 psychic damage to the target. The target must make a Wisdom saving throw. On a failed save, it has disadvantage on attack rolls and ability checks, and can't take reactions, until the end of its next turn.`,
    tags: ["smite","damage","psychic","debuff","paladin","concentration"]
  },
  {
    title: "Steel Wind Strike",
    level: 5, school: "Conjuration",
    casting_time: "1 action",
    range: "30 ft",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Ranger","Wizard"],
    body: `You flourish the weapon used in the casting and then vanish to strike like the wind. Choose up to five creatures you can see within range. Make a melee spell attack against each target. On a hit, a target takes 6d10 force damage. You can then teleport to an unoccupied space you can see within 5 feet of one of the targets you hit or missed.`,
    tags: ["damage","force","melee","teleport","attack","multi-target"]
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
    title: "Spirit Shroud",
    level: 3, school: "Necromancy",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Cleric","Paladin","Warlock","Wizard"],
    body: `You call forth spirits of the dead, which flit around you for the spell's duration. You choose one of the following forms: Funereal (radiant), Festive (radiant), or Fearsome (necrotic/cold). When you deal damage to a creature within 10 feet of you, you can deal an extra 1d8 damage of the chosen type to that creature. Any creature that starts its turn within 10 feet of you has its speed reduced by 10 feet until the start of that creature's next turn.`,
    tags: ["damage","buff","necrotic","radiant","cold","concentration","bonus action"]
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
    title: "Storm Sphere",
    level: 4, school: "Evocation",
    casting_time: "1 action",
    range: "150 ft",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Sorcerer","Wizard"],
    body: `A 20-foot-radius sphere of whirling air springs into existence centered on a point you choose within range. The sphere remains for the spell's duration. Each creature in the sphere when it appears or that ends its turn there must succeed on a Strength saving throw or take 2d6 bludgeoning damage. The sphere's space is difficult terrain. Until the spell ends, you can use a bonus action on each of your turns to cause a bolt of lightning to leap from the center of the sphere toward one creature you choose within 60 feet of the center. Make a ranged spell attack. You have advantage on the attack roll if the target is in the sphere. On a hit, the target takes 4d6 lightning damage.`,
    tags: ["damage","lightning","area","control","concentration"]
  },
  {
    title: "Suggestion",
    level: 2, school: "Enchantment", concentration: true,
    casting_time: "1 action", range: "30 feet", components: "V, M (snake's tongue and honeycomb or sweet oil)",
    duration: "Up to 8 hours (Concentration)",
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    tags: ["charm","control"],
    body: "Influence a creature with a magically compelling suggestion that sounds reasonable. It follows the command unless it would cause obvious harm."
  },
  {
    title: "Summon Aberration",
    level: 4, school: "Conjuration",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Warlock","Wizard"],
    body: `You call forth an aberrant spirit from the Far Realm. It manifests in an unoccupied space that you can see within range. The spirit takes the form you choose: Beholderkin, Slaad, or Star Spawn. The creature is friendly to you and your companions and obeys your commands. It disappears when it drops to 0 hit points or when the spell ends.`,
    tags: ["summon","conjuration","concentration","tasha"]
  },
  {
    title: "Summon Beast",
    level: 2, school: "Conjuration",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Druid","Ranger"],
    body: `You call forth a bestial spirit from the primal wilderness. It manifests in an unoccupied space that you can see within range. The spirit takes the form you choose: Air, Land, or Water. The creature is friendly to you and your companions and obeys your commands. It disappears when it drops to 0 hit points or when the spell ends.`,
    tags: ["summon","conjuration","concentration","tasha"]
  },
  {
    title: "Summon Celestial",
    level: 5, school: "Conjuration",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Cleric","Paladin"],
    body: `You call forth a celestial spirit from the Upper Planes. It manifests in an unoccupied space that you can see within range. The spirit takes the form you choose: Avenger or Defender. The creature is friendly to you and your companions and obeys your commands. It disappears when it drops to 0 hit points or when the spell ends.`,
    tags: ["summon","conjuration","concentration","tasha","radiant"]
  },
  {
    title: "Summon Construct",
    level: 4, school: "Conjuration",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Artificer","Wizard"],
    body: `You call forth a construct spirit. It manifests in an unoccupied space that you can see within range. The spirit takes the form you choose: Clay, Metal, or Stone. The creature is friendly to you and your companions and obeys your commands. It disappears when it drops to 0 hit points or when the spell ends.`,
    tags: ["summon","conjuration","concentration","tasha"]
  },
  {
    title: "Summon Draconic Spirit",
    level: 5, school: "Conjuration",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `You call forth a draconic spirit. It manifests in an unoccupied space that you can see within range. This corporeal form uses the Draconic Spirit stat block. When you cast this spell, choose a family of dragon: Chromatic, Gem, or Metallic. The creature resembles a dragon of the chosen family, which determines certain traits in its stat block. The creature disappears when it drops to 0 hit points or when the spell ends.`,
    tags: ["summon","conjuration","concentration","tasha","dragon"]
  },
  {
    title: "Summon Elemental",
    level: 4, school: "Conjuration",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Druid","Ranger","Wizard"],
    body: `You call forth an elemental spirit from the Elemental Planes. It manifests in an unoccupied space that you can see within range. The spirit takes the form you choose: Air, Earth, Fire, or Water. The creature is friendly to you and your companions and obeys your commands. It disappears when it drops to 0 hit points or when the spell ends.`,
    tags: ["summon","conjuration","concentration","tasha","elemental"]
  },
  {
    title: "Summon Fey",
    level: 3, school: "Conjuration",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Druid","Ranger","Warlock","Wizard"],
    body: `You call forth a fey spirit from the Feywild. It manifests in an unoccupied space that you can see within range. The spirit takes the form you choose: Fuming, Mirthful, or Tricksy. The creature is friendly to you and your companions and obeys your commands. It disappears when it drops to 0 hit points or when the spell ends.`,
    tags: ["summon","conjuration","concentration","tasha","fey"]
  },
  {
    title: "Summon Fiend",
    level: 6, school: "Conjuration",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Warlock","Wizard"],
    body: `You call forth a fiendish spirit from the Lower Planes. It manifests in an unoccupied space that you can see within range. The spirit takes the form you choose: Demon, Devil, or Yugoloth. The creature is friendly to you and your companions and obeys your commands. It disappears when it drops to 0 hit points or when the spell ends.`,
    tags: ["summon","conjuration","concentration","tasha","fiend"]
  },
  {
    title: "Summon Shadowspawn",
    level: 3, school: "Conjuration",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Warlock","Wizard"],
    body: `You call forth a shadowy spirit from the Shadowfell. It manifests in an unoccupied space that you can see within range. The spirit takes the form you choose: Fury, Despair, or Fear. The creature is friendly to you and your companions and obeys your commands. It disappears when it drops to 0 hit points or when the spell ends.`,
    tags: ["summon","conjuration","concentration","tasha","shadow"]
  },
  {
    title: "Summon Undead",
    level: 3, school: "Necromancy",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 hour",
    concentration: true,
    classes: ["Warlock","Wizard"],
    body: `You call forth an undead spirit. It manifests in an unoccupied space that you can see within range. The spirit takes the form you choose: Ghostly, Putrid, or Skeletal. The creature is friendly to you and your companions and obeys your commands. It disappears when it drops to 0 hit points or when the spell ends.`,
    tags: ["summon","conjuration","concentration","tasha","undead","necromancy"]
  },
  {
    title: "Swift Quiver",
    level: 5, school: "Transmutation",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Ranger"],
    body: `You transmute your quiver so it produces an endless supply of nonmagical ammunition, which seems to leap into your hand when you reach for it. On each of your turns until the spell ends, you can use a bonus action to make two attacks with a weapon that uses ammunition from the quiver.`,
    tags: ["buff","ranger","bonus action","attack","concentration"]
  },
  {
    title: "Synaptic Static",
    level: 5, school: "Enchantment",
    casting_time: "1 action",
    range: "120 ft",
    components: "V,S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Bard","Sorcerer","Warlock","Wizard"],
    body: `You choose a point within range and cause psychic energy to explode there. Each creature in a 20-foot-radius sphere centered on that point must make an Intelligence saving throw. A creature with an Intelligence score of 2 or lower can't be affected. A target takes 8d6 psychic damage on a failed save, or half as much damage on a successful one. After a failed save, a target has muddled thoughts for 1 minute. During that time, it rolls a d6 and subtracts the number rolled from all its attack rolls and ability checks, as well as its Constitution saving throws to maintain concentration.`,
    tags: ["damage","psychic","area","debuff","intelligence"]
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
    title: "Sword Burst",
    level: 0, school: "Conjuration",
    casting_time: "1 action",
    range: "Self (5-foot radius)",
    components: "V",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Artificer","Sorcerer","Warlock","Wizard"],
    body: `You create a momentary circle of spectral blades that sweep around you. Each creature within 5 feet of you must succeed on a Dexterity saving throw or take 1d6 force damage. The spell's damage increases when you reach higher levels.`,
    tags: ["cantrip","damage","force","save","area"]
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
    title: "Tasha's Caustic Brew",
    level: 1, school: "Evocation",
    casting_time: "1 action",
    range: "Self (30-foot line)",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Artificer","Sorcerer","Wizard"],
    body: `A stream of acid emanates from you in a line 30 feet long and 5 feet wide in a direction you choose. Each creature in the line must succeed on a Dexterity saving throw or be covered in acid for the spell's duration or until a creature uses its action to scrape or wash the acid off itself or another creature. A creature covered in the acid takes 2d4 acid damage at start of each of its turns.`,
    tags: ["damage","acid","concentration","line"]
  },
  {
    title: "Tasha's Mind Whip",
    level: 2, school: "Enchantment",
    casting_time: "1 action",
    range: "90 ft",
    components: "V",
    duration: "1 round",
    concentration: false,
    classes: ["Sorcerer","Wizard"],
    body: `You psychically lash out at one creature you can see within range. The target must make an Intelligence saving throw. On a failed save, the target takes 3d6 psychic damage, and it can't take a reaction until the end of its next turn. Moreover, on its next turn, it must choose whether it gets a move, an action, or a bonus action; it gets only one of the three. On a successful save, the target takes half as much damage and suffers none of the spell's other effects.`,
    tags: ["damage","psychic","debuff","control"]
  },
  {
    title: "Tasha's Otherworldly Guise",
    level: 6, school: "Transmutation",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `Uttering an incantation, you draw on the magic of the Lower Planes or Upper Planes (your choice) to transform yourself. You gain the following benefits until the spell ends: immunity to fire and poison (Lower) or radiant and necrotic (Upper), immunity to poisoned (Lower) or charmed (Upper), flying speed 40 feet, +2 AC, weapon attacks are magical and use spellcasting ability, and you can attack twice when you take the Attack action.`,
    tags: ["buff","transformation","immunity","concentration","bonus action"]
  },
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
    title: "Temple of the Gods",
    level: 7, school: "Conjuration",
    casting_time: "1 hour",
    range: "120 ft",
    components: "V,S,M",
    duration: "24 hours",
    concentration: false,
    classes: ["Cleric"],
    body: `You cause a temple to shimmer into existence on ground you can see within range. The temple must fit within an unoccupied cube of space, up to 120 feet on each side. The temple remains until the spell ends. It is dedicated to whatever god, pantheon, or philosophy is represented by the holy symbol used in the casting. You make all decisions about the temple's appearance. The interior is enclosed by a floor and walls, with a single door. The temple is made of opaque magical force extending into the Ethereal Plane, blocking ethereal travel. Fiends and undead can't willingly enter the temple.`,
    tags: ["utility","sanctuary","protection"]
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
    title: "Thorn Whip",
    level: 0, school: "Transmutation",
    casting_time: "1 action",
    range: "30 ft",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Druid","Artificer"],
    body: `You create a long, vine-like whip covered in thorns that lashes out at your command toward a creature in range. Make a melee spell attack against the target. If the attack hits, the creature takes 1d6 piercing damage, and if the creature is Large or smaller, you pull the creature up to 10 feet closer to you. This spell's damage increases by 1d6 when you reach 5th level (2d6), 11th level (3d6), and 17th level (4d6).`,
    tags: ["cantrip","damage","piercing","control","melee","pull"]
  },
  {
    title: "Thunderous Smite",
    level: 1, school: "Evocation",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Paladin"],
    body: `The first time you hit with a melee weapon attack during this spell's duration, your weapon rings with thunder that is audible within 300 feet of you, and the attack deals an extra 2d6 thunder damage to the target. Additionally, if the target is a creature, it must succeed on a Strength saving throw or be pushed 10 feet away from you and knocked prone.`,
    tags: ["smite","damage","thunder","buff","paladin","concentration"]
  },
  {
    title: "Thunderclap",
    level: 0, school: "Evocation",
    casting_time: "1 action",
    range: "Self (5-foot radius)",
    components: "S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Artificer","Bard","Druid","Sorcerer","Warlock","Wizard"],
    body: `You create a burst of thunderous sound that can be heard up to 100 feet away. Each creature within 5 feet of you must succeed on a Constitution saving throw or take 1d6 thunder damage. The spell's damage increases when you reach higher levels.`,
    tags: ["cantrip","damage","thunder","save","area"]
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
    body: "You briefly stop time for everyone but yourself. You take 1d4 + 1 turns in a row, during which you can't affect other creatures or objects directly."
  },
  {
    title: "Tidal Wave",
    level: 3, school: "Conjuration",
    casting_time: "1 action",
    range: "120 ft",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `You conjure up a wave of water that crashes down on an area within range. The area can be up to 30 feet long, up to 10 feet wide, and up to 10 feet tall. Each creature in that area must make a Dexterity saving throw. On a failure, a creature takes 4d8 bludgeoning damage and is knocked prone. On a success, a creature takes half as much damage and isn't knocked prone. The water then spreads out across the ground in all directions, extinguishing unprotected flames in its area and within 30 feet of it.`,
    tags: ["damage","bludgeoning","area","water","control"]
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
    title: "Tiny Servant",
    level: 3, school: "Transmutation",
    casting_time: "1 minute",
    range: "Touch",
    components: "V,S",
    duration: "8 hours",
    concentration: false,
    classes: ["Artificer","Wizard"],
    body: `You touch one Tiny, nonmagical object that isn't attached to another object or surface and isn't being carried by another creature. The target animates and sprouts little arms and legs, becoming a creature under your control until the spell ends or the creature drops to 0 hit points. You can mentally command the creature if it is within 120 feet of you. You can animate two additional objects for each spell slot level above 3rd.`,
    tags: ["utility","servant","animation"]
  },
  {
    title: "Toll the Dead",
    level: 0, school: "Necromancy",
    casting_time: "1 action",
    range: "60 ft",
    components: "V,S",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Cleric","Warlock","Wizard"],
    body: `You point at one creature you can see within range, and the sound of a dolorous bell fills the air around it for a moment. The target must succeed on a Wisdom saving throw or take 1d8 necrotic damage. If the target is missing any of its hit points, it instead takes 1d12 necrotic damage. The spell's damage increases when you reach higher levels.`,
    tags: ["cantrip","damage","necrotic","save"]
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
    title: "Transmute Rock",
    level: 5, school: "Transmutation",
    casting_time: "1 action",
    range: "120 ft",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Artificer","Druid","Wizard"],
    body: `You choose an area of stone or mud that you can see that fits within a 40-foot cube and is within range, and choose one of the following effects. Rock to Mud: Nonmagical rock of any sort in the area becomes an equal volume of thick, flowing mud. Mud to Rock: Nonmagical mud or quicksand in the area becomes soft stone. The transformation lasts until the spell ends.`,
    tags: ["utility","terrain","transmutation"]
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
  {
    title: "Vitriolic Sphere",
    level: 4, school: "Evocation",
    casting_time: "1 action",
    range: "150 ft",
    components: "V,S,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Sorcerer","Wizard"],
    body: `You point at a location within range, and a glowing, 1-foot-diameter ball of emerald acid streaks there and explodes in a 20-foot-radius sphere. Each creature in that area must make a Dexterity saving throw. On a failed save, a creature takes 10d4 acid damage and another 5d4 acid damage at the end of its next turn. On a successful save, a creature takes half the initial damage and no damage at the end of its next turn.`,
    tags: ["damage","acid","area","save"]
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
    title: "Warding Wind",
    level: 2, school: "Evocation",
    casting_time: "1 action",
    range: "Self",
    components: "V",
    duration: "Up to 10 minutes",
    concentration: true,
    classes: ["Bard","Druid","Sorcerer","Wizard"],
    body: `A strong wind (20 miles per hour) blows around you in a 10-foot radius and moves with you, remaining centered on you. The wind lasts for the spell's duration. The wind has the following effects: It deafens you and other creatures in its area. It extinguishes unprotected flames in its area that are torch-sized or smaller. It hedges out vapor, gas, and fog that can be dispersed by strong wind. The area is difficult terrain for creatures other than you. The attack rolls of ranged weapon attacks have disadvantage if the attacks pass in or out of the wind.`,
    tags: ["control","defense","utility","concentration"]
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
    title: "Watery Sphere",
    level: 4, school: "Conjuration",
    casting_time: "1 action",
    range: "90 ft",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `You conjure up a sphere of water with a 5-foot radius at a point you can see within range. The sphere can hover but no more than 10 feet off the ground. The sphere remains for the spell's duration. Any creature in the sphere's space must make a Strength saving throw. On a successful save, a creature is ejected from that space to the nearest unoccupied space of the creature's choice outside the sphere. A Huge or larger creature succeeds on the saving throw automatically, and a Large or smaller creature can choose to fail it. On a failed save, a creature is restrained by the sphere and is engulfed by the water. At the end of each of its turns, a restrained target can repeat the saving throw, ending the effect on itself on a success.`,
    tags: ["control","water","restrained","concentration"]
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
    title: "Whirlwind",
    level: 7, school: "Evocation",
    casting_time: "1 action",
    range: "300 ft",
    components: "V,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Druid","Sorcerer","Wizard"],
    body: `A whirlwind howls down to a point on the ground you specify. The whirlwind is a 10-foot-radius, 30-foot-high cylinder centered on that point. Until the spell ends, you can use your action to move the whirlwind up to 30 feet in any direction along the ground. The whirlwind sucks up any Medium or smaller objects that aren't secured to anything and that aren't worn or carried by anyone. A creature must make a Dexterity saving throw the first time on a turn that it enters the whirlwind or that the whirlwind enters its space, including when the whirlwind first appears. A creature takes 10d6 bludgeoning damage on a failed save, or half as much damage on a successful one. In addition, a Large or smaller creature that fails the save must succeed on a Strength saving throw or become restrained in the whirlwind until the spell ends.`,
    tags: ["damage","bludgeoning","control","area","concentration"]
  },
  {
    title: "Witch Bolt",
    level: 1, school: "Evocation",
    casting_time: "1 action",
    range: "30 ft",
    components: "V,S,M",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Sorcerer","Warlock","Wizard"],
    body: `A beam of crackling, blue energy lances out toward a creature within range, forming a sustained arc of lightning between you and the target. Make a ranged spell attack against that creature. On a hit, the target takes 1d12 lightning damage, and on each of your turns for the duration, you can use your action to deal 1d12 lightning damage to the target automatically. The spell ends if you use your action to do anything else or if the target is ever outside the spell's range or if it has total cover from you.`,
    tags: ["damage","lightning","attack","concentration"]
  },
  {
    title: "Wrath of Nature",
    level: 5, school: "Evocation",
    casting_time: "1 action",
    range: "120 ft",
    components: "V,S",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Druid","Ranger"],
    body: `You call out to the spirits of nature to rouse them against your enemies. Choose a point you can see within range. The spirits cause trees, rocks, grass, and other natural features in a 60-foot cube centered on that point to become animated until the spell ends. Creatures in the area may be grasped by grass and roots, battered by rocks, struck by tree branches, or lashed by vines. Each creature in the area must make a Dexterity saving throw or take damage and be subject to various effects based on the terrain.`,
    tags: ["damage","area","control","nature","concentration"]
  },
  {
    title: "Wrathful Smite",
    level: 1, school: "Evocation",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Paladin"],
    body: `The next time you hit with a melee weapon attack during this spell's duration, your attack deals an extra 1d6 psychic damage. Additionally, if the target is a creature, it must make a Wisdom saving throw or be frightened of you until the spell ends. As an action, the creature can make a Wisdom check against your spell save DC to steel its resolve and end this spell.`,
    tags: ["smite","damage","psychic","debuff","paladin","concentration"]
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
  {
    title: "Word of Radiance",
    level: 0, school: "Evocation",
    casting_time: "1 action",
    range: "5 ft",
    components: "V,M",
    duration: "Instantaneous",
    concentration: false,
    classes: ["Cleric"],
    body: `You utter a divine word, and burning radiance erupts from you. Each creature of your choice that you can see within 5 feet of you must succeed on a Constitution saving throw or take 1d6 radiant damage. The spell's damage increases when you reach higher levels.`,
    tags: ["cantrip","damage","radiant","save","area"]
  },
  // ===== Z =====
  {
    title: "Zephyr Strike",
    level: 1, school: "Transmutation",
    casting_time: "1 bonus action",
    range: "Self",
    components: "V",
    duration: "Up to 1 minute",
    concentration: true,
    classes: ["Ranger"],
    body: `You move like the wind. Until the spell ends, your movement doesn't provoke opportunity attacks. Once before the spell ends, you can give yourself advantage on one weapon attack roll on your turn. That attack deals an extra 1d8 force damage on a hit. Whether you hit or miss, your walking speed increases by 30 feet until the end of that turn.`,
    tags: ["buff","mobility","damage","force","ranger","concentration"]
  },
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