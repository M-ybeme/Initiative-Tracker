/**
 * Character Creation Wizard
 * A step-by-step guide for new D&D 5e players creating their first character
 */

const CharacterCreationWizard = (function() {
  'use strict';

  let currentStep = 0;
  let wizardData = {};

  /**
   * Generate tooltip content for a spell
   * @param {Object} spell - The spell object
   * @returns {string} - HTML tooltip content
   */
  function getSpellTooltipContent(spell) {
    const lines = [];
    if (spell.casting_time) lines.push(`<strong>Casting Time:</strong> ${spell.casting_time}`);
    if (spell.range) lines.push(`<strong>Range:</strong> ${spell.range}`);
    if (spell.components) lines.push(`<strong>Components:</strong> ${spell.components}`);
    if (spell.duration) lines.push(`<strong>Duration:</strong> ${spell.duration}${spell.concentration ? ' (C)' : ''}`);
    if (spell.body) {
      lines.push(`<hr class="my-1">${spell.body}`);
    }
    return lines.join('<br>');
  }

  /**
   * Escape HTML for use in attributes
   * @param {string} str - String to escape
   * @returns {string} - Escaped string
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const steps = [
    {
      title: "Welcome to Character Creation!",
      content: `
        <div class="text-center">
          <h4>Let's create your D&D character!</h4>
          <p class="lead">This wizard will guide you through creating a 5th Edition D&D character step by step.</p>
          <p>We'll help you with:</p>
          <ul class="text-start">
            <li>Choosing your race and class</li>
            <li>Rolling ability scores</li>
            <li>Calculating your character's stats</li>
            <li>Selecting skills and proficiencies</li>
            <li>Setting up your character sheet</li>
          </ul>
          <p class="text-muted small mt-3">Don't worry if you're new - we'll explain everything along the way!</p>
        </div>
      `,
      buttons: ['Next']
    },
    {
      title: "Step 1: Basic Information",
      content: `
        <h5>Let's start with the basics</h5>
        <p>Give your character a name and some basic details.</p>
        <div class="mb-3">
          <label for="wizardCharName" class="form-label">Character Name *</label>
          <input type="text" class="form-control" id="wizardCharName" placeholder="e.g., Thaldrin Ironforge">
          <div class="form-text">Choose a name that fits your character's personality and background.</div>
        </div>
        <div class="mb-3">
          <label for="wizardPlayerName" class="form-label">Your Name (Player)</label>
          <input type="text" class="form-control" id="wizardPlayerName" placeholder="Your real name">
        </div>
        <div class="mb-3">
          <label for="wizardLevel" class="form-label">Starting Level</label>
          <select class="form-select" id="wizardLevel">
            <option value="1" selected>1st Level (New adventurer)</option>
            <option value="3">3rd Level (Experienced)</option>
            <option value="5">5th Level (Veteran)</option>
          </select>
          <div class="form-text">Most new campaigns start at level 1.</div>
        </div>
      `,
      buttons: ['Back', 'Next'],
      validate: () => {
        const name = document.getElementById('wizardCharName')?.value.trim();
        if (!name) {
          alert('Please enter a character name.');
          return false;
        }
        wizardData.name = name;
        wizardData.playerName = document.getElementById('wizardPlayerName')?.value.trim() || '';
        wizardData.level = parseInt(document.getElementById('wizardLevel')?.value) || 1;
        return true;
      }
    },
    {
      title: "Step 2: Choose Your Race",
      content: `
        <h5>Pick your character's race</h5>
        <p>Your race determines your heritage and provides ability score bonuses and special traits.</p>
        <div class="mb-3">
          <label for="wizardRace" class="form-label">Race *</label>
          <select class="form-select" id="wizardRace">
            <option value="">Choose a race...</option>
            <optgroup label="Common Races (PHB)">
              <option value="Human">Human - Versatile, +1 to all abilities</option>
              <option value="Elf">Elf - Graceful, +2 Dex, darkvision, keen senses</option>
              <option value="Dwarf">Dwarf - Sturdy, +2 Con, darkvision, resilient</option>
              <option value="Halfling">Halfling - Lucky, +2 Dex, brave, nimble</option>
              <option value="Dragonborn">Dragonborn - Draconic, +2 Str +1 Cha, breath weapon</option>
              <option value="Gnome">Gnome - Clever, +2 Int, darkvision, cunning</option>
              <option value="Half-Elf">Half-Elf - Charismatic, +2 Cha +1 to two others, versatile</option>
              <option value="Half-Orc">Half-Orc - Strong, +2 Str +1 Con, relentless, savage</option>
              <option value="Tiefling">Tiefling - Infernal, +2 Cha +1 Int, darkvision, fire resistance</option>
            </optgroup>
            <optgroup label="Exotic Races (Volo's Guide)">
              <option value="Aarakocra">Aarakocra - Bird-like, +2 Dex +1 Wis, flight</option>
              <option value="Aasimar">Aasimar - Celestial, +2 Cha +1 Wis, healing hands, light bearer</option>
              <option value="Bugbear">Bugbear - Sneaky brute, +2 Str +1 Dex, long-limbed, surprise attack</option>
              <option value="Firbolg">Firbolg - Gentle giant, +2 Wis +1 Str, druidic magic, hidden step</option>
              <option value="Goblin">Goblin - Small trickster, +2 Dex +1 Con, nimble escape, fury of the small</option>
              <option value="Goliath">Goliath - Mountain warrior, +2 Str +1 Con, powerful build, stone's endurance</option>
              <option value="Hobgoblin">Hobgoblin - Disciplined warrior, +2 Con +1 Int, martial training, saving face</option>
              <option value="Kenku">Kenku - Crow-like mimic, +2 Dex +1 Wis, expert forgery, mimicry</option>
              <option value="Kobold">Kobold - Small dragon-kin, +2 Dex -2 Str, pack tactics, sunlight sensitivity</option>
              <option value="Lizardfolk">Lizardfolk - Reptilian survivor, +2 Con +1 Wis, natural armor, hold breath</option>
              <option value="Orc">Orc - Savage warrior, +2 Str +1 Con, aggressive, powerful build</option>
              <option value="Tabaxi">Tabaxi - Cat-like wanderer, +2 Dex +1 Cha, feline agility, cat's claws</option>
              <option value="Triton">Triton - Sea guardian, +1 Str +1 Con +1 Cha, amphibious, control water/air</option>
              <option value="Yuan-ti Pureblood">Yuan-ti Pureblood - Serpentine, +2 Cha +1 Int, magic resistance, poison immunity</option>
            </optgroup>
            <optgroup label="Elemental Races">
              <option value="Genasi (Air)">Air Genasi - Wind-touched, +2 Con +1 Dex, unending breath, levitate</option>
              <option value="Genasi (Earth)">Earth Genasi - Stone-touched, +2 Con +1 Str, earth walk, pass without trace</option>
              <option value="Genasi (Fire)">Fire Genasi - Flame-touched, +2 Con +1 Int, darkvision, fire resistance, burning hands</option>
              <option value="Genasi (Water)">Water Genasi - Wave-touched, +2 Con +1 Wis, amphibious, acid resistance, shape water</option>
            </optgroup>
            <optgroup label="Ravnica Races">
              <option value="Centaur">Centaur - Horse-bodied, +2 Str +1 Wis, charge, hooves, equine build</option>
              <option value="Loxodon">Loxodon - Elephant-like, +2 Con +1 Wis, powerful build, natural armor, trunk</option>
              <option value="Minotaur">Minotaur - Bull-headed, +2 Str +1 Con, horns, goring rush, hammering horns</option>
              <option value="Simic Hybrid">Simic Hybrid - Bio-engineered, +2 Con +1 to one other, animal enhancement</option>
              <option value="Vedalken">Vedalken - Blue-skinned, +2 Int +1 Wis, tireless precision, partially amphibious</option>
            </optgroup>
            <optgroup label="Theros Races">
              <option value="Leonin">Leonin - Lion-like, +2 Con +1 Str, claws, roar, hunter's instinct</option>
              <option value="Satyr">Satyr - Fey goat-folk, +2 Cha +1 Dex, magic resistance, mirthful leaps, reveler</option>
            </optgroup>
            <optgroup label="Eberron Races">
              <option value="Changeling">Changeling - Shapeshifter, +2 Cha +1 to one other, change appearance, unsettling</option>
              <option value="Kalashtar">Kalashtar - Dream-touched, +2 Wis +1 Cha, telepathy, psychic resistance</option>
              <option value="Shifter">Shifter - Were-touched, +2 Dex +1 to one other, shifting feature, darkvision</option>
              <option value="Warforged">Warforged - Construct, +2 Con +1 to one other, integrated protection, constructed resilience</option>
            </optgroup>
            <optgroup label="Other Races">
              <option value="Tortle">Tortle - Turtle-like, +2 Str +1 Wis, natural armor, shell defense, hold breath</option>
              <option value="Locathah">Locathah - Fish-like, +2 Dex +1 Wis, natural armor, limited amphibiousness</option>
              <option value="Grung">Grung - Poison frog, +2 Dex +1 Con, poison skin, standing leap, water dependency</option>
            </optgroup>
          </select>
        </div>
        <div id="subraceSection" class="mb-3" style="display:none;">
          <label for="wizardSubrace" class="form-label">Subrace</label>
          <select class="form-select" id="wizardSubrace">
            <option value="">Choose a subrace...</option>
          </select>
        </div>
        <div id="raceDescription" class="alert alert-info" style="display:none;"></div>
        <div id="racialScalingTable" class="mt-3" style="display:none;">
          <h6 class="text-primary"><i class="bi bi-graph-up me-1"></i>Scaling Feature Reference</h6>
          <div class="card bg-dark border-secondary">
            <div class="card-body">
              <h6 id="scalingFeatureName" class="card-title text-warning"></h6>
              <p id="scalingFeatureDesc" class="card-text small"></p>
              <table class="table table-sm table-dark table-striped mt-2">
                <thead>
                  <tr>
                    <th>Character Level</th>
                    <th>Effect</th>
                  </tr>
                </thead>
                <tbody id="scalingTableBody">
                </tbody>
              </table>
              <p id="scalingFeatureNote" class="small text-muted mb-0 mt-2"></p>
            </div>
          </div>
        </div>
      `,
      buttons: ['Back', 'Next'],
      validate: () => {
        const race = document.getElementById('wizardRace')?.value;
        if (!race) {
          alert('Please choose a race.');
          return false;
        }
        wizardData.race = race;
        wizardData.subrace = document.getElementById('wizardSubrace')?.value || '';
        return true;
      },
      onShow: () => {
        const raceSelect = document.getElementById('wizardRace');
        const subraceSection = document.getElementById('subraceSection');
        const subraceSelect = document.getElementById('wizardSubrace');
        const raceDesc = document.getElementById('raceDescription');

        // Define subraces for applicable races
        const subraces = {
          'Elf': [
            { value: 'High Elf', label: 'High Elf - Extra cantrip, weapon training, extra language' },
            { value: 'Wood Elf', label: 'Wood Elf - Increased speed, mask of the wild, weapon training' },
            { value: 'Dark Elf (Drow)', label: 'Dark Elf (Drow) - Superior darkvision, sunlight sensitivity, drow magic' },
            { value: 'Eladrin', label: 'Eladrin - Fey step, seasonal abilities' },
            { value: 'Sea Elf', label: 'Sea Elf - Swim speed, amphibious, friend of the sea' }
          ],
          'Dwarf': [
            { value: 'Hill Dwarf', label: 'Hill Dwarf - Extra HP, dwarven toughness' },
            { value: 'Mountain Dwarf', label: 'Mountain Dwarf - +2 Str, light/medium armor proficiency' },
            { value: 'Duergar', label: 'Duergar - Superior darkvision, enlarge/invisibility spells, sunlight sensitivity' }
          ],
          'Halfling': [
            { value: 'Lightfoot', label: 'Lightfoot - +1 Cha, naturally stealthy' },
            { value: 'Stout', label: 'Stout - +1 Con, poison resistance' },
            { value: 'Ghostwise', label: 'Ghostwise - +1 Wis, silent speech telepathy' }
          ],
          'Gnome': [
            { value: 'Forest Gnome', label: 'Forest Gnome - +1 Dex, natural illusionist, speak with small beasts' },
            { value: 'Rock Gnome', label: 'Rock Gnome - +1 Con, artificer\'s lore, tinker' },
            { value: 'Deep Gnome (Svirfneblin)', label: 'Deep Gnome - +1 Dex, superior darkvision, stone camouflage' }
          ],
          'Dragonborn': [
            { value: 'Black', label: 'Black Dragon Ancestry - Acid breath (line)' },
            { value: 'Blue', label: 'Blue Dragon Ancestry - Lightning breath (line)' },
            { value: 'Brass', label: 'Brass Dragon Ancestry - Fire breath (line)' },
            { value: 'Bronze', label: 'Bronze Dragon Ancestry - Lightning breath (line)' },
            { value: 'Copper', label: 'Copper Dragon Ancestry - Acid breath (line)' },
            { value: 'Gold', label: 'Gold Dragon Ancestry - Fire breath (cone)' },
            { value: 'Green', label: 'Green Dragon Ancestry - Poison breath (cone)' },
            { value: 'Red', label: 'Red Dragon Ancestry - Fire breath (cone)' },
            { value: 'Silver', label: 'Silver Dragon Ancestry - Cold breath (cone)' },
            { value: 'White', label: 'White Dragon Ancestry - Cold breath (cone)' }
          ],
          'Tiefling': [
            { value: 'Asmodeus', label: 'Asmodeus Bloodline - Fire spells' },
            { value: 'Baalzebul', label: 'Baalzebul Bloodline - Corruption spells' },
            { value: 'Dispater', label: 'Dispater Bloodline - Disguise spells' },
            { value: 'Fierna', label: 'Fierna Bloodline - Charm spells' },
            { value: 'Glasya', label: 'Glasya Bloodline - Illusion spells' },
            { value: 'Levistus', label: 'Levistus Bloodline - Ice spells' },
            { value: 'Mammon', label: 'Mammon Bloodline - Trickery spells' },
            { value: 'Mephistopheles', label: 'Mephistopheles Bloodline - Arcane spells' },
            { value: 'Zariel', label: 'Zariel Bloodline - Combat spells' }
          ],
          'Aasimar': [
            { value: 'Protector', label: 'Protector - Flight, radiant damage' },
            { value: 'Scourge', label: 'Scourge - Radiant damage aura' },
            { value: 'Fallen', label: 'Fallen - Frighten enemies, necrotic damage' }
          ],
          'Shifter': [
            { value: 'Beasthide', label: 'Beasthide - +1 Con, tough and resilient' },
            { value: 'Longtooth', label: 'Longtooth - +1 Str, fierce bite attack' },
            { value: 'Swiftstride', label: 'Swiftstride - +1 Dex, swift and agile' },
            { value: 'Wildhunt', label: 'Wildhunt - +1 Wis, heightened senses' }
          ]
        };

        const descriptions = {
          'Human': 'Humans are the most adaptable and ambitious people. They get +1 to all ability scores, making them viable for any class.',
          'Elf': 'Elves are magical people of otherworldly grace. They have keen senses, darkvision, and advantage against charm. Choose a subrace for additional traits.',
          'Dwarf': 'Dwarves are stout and hardy, known for mining and craftsmanship. They resist poison, have darkvision, and proficiency with certain weapons. Choose a subrace.',
          'Halfling': 'Halflings are small, cheerful folk who value comfort. They are naturally lucky, brave, and nimble. Choose a subrace for additional traits.',
          'Dragonborn': 'Dragonborn look like humanoid dragons. Choose your draconic ancestry to determine your breath weapon and damage resistance.',
          'Gnome': 'Gnomes are small, intelligent, and inventive. They have advantage against magic, darkvision, and keen intellect. Choose a subrace.',
          'Half-Elf': 'Half-elves combine human ambition with elven grace. They are versatile, charismatic, and get +2 to Charisma plus +1 to two other abilities.',
          'Half-Orc': 'Half-orcs are strong and intimidating, with fierce determination. They can endure death and deal devastating critical hits.',
          'Tiefling': 'Tieflings have infernal heritage, giving them a devilish appearance and innate fire resistance. Choose a bloodline for specific magical abilities.',
          'Aarakocra': 'Bird-like humanoids with the gift of flight. They soar through the skies and have talons for natural weapons. Flight speed of 50 feet.',
          'Aasimar': 'Touched by celestial power, aasimar are mortals who carry the light of heaven. They have healing hands and can reveal their divine soul.',
          'Bugbear': 'Large goblinoids known for surprising attacks. Their long arms give them extra reach, and they excel at ambush tactics.',
          'Centaur': 'Half-human, half-horse creatures. Their hooves are natural weapons, they can charge into battle, and have increased carrying capacity.',
          'Changeling': 'Shapechangers who can alter their appearance at will. Perfect for infiltration and disguise, with natural deception abilities.',
          'Firbolg': 'Gentle forest giants with innate druidic magic. They can turn invisible, speak with beasts, and have powerful builds.',
          'Genasi (Air)': 'Touched by elemental air. Can hold breath indefinitely and cast levitate once per day. Inherently connected to wind and sky.',
          'Genasi (Earth)': 'Touched by elemental earth. Can move across difficult terrain and cast pass without trace once per day.',
          'Genasi (Fire)': 'Touched by elemental fire. Resistant to fire damage, have darkvision, and can cast burning hands once per day.',
          'Genasi (Water)': 'Touched by elemental water. Amphibious, resistant to acid, and can cast shape water at will.',
          'Goblin': 'Small and nimble tricksters. Can bonus action disengage or hide, and deal extra damage when at low health.',
          'Goliath': 'Towering mountain dwellers with incredible strength. Can shrug off damage once per rest and have powerful builds.',
          'Grung': 'Small poisonous frog people. Their skin secretes poison, and they have powerful leaping abilities but need water regularly.',
          'Hobgoblin': 'Disciplined warriors with martial training. Can add bonuses to allies\' attacks and save face when they miss.',
          'Kalashtar': 'Bound to dream spirits from another plane. Have telepathy, advantage against psychic damage, and don\'t need to sleep.',
          'Kenku': 'Crow-like creatures cursed to never fly. Master mimics who can duplicate any sound, with expertise in forgery.',
          'Kobold': 'Small draconic creatures who work best in groups. Have pack tactics for advantage but sunlight sensitivity for disadvantage.',
          'Leonin': 'Fierce lion-like warriors. Have natural claw attacks, a frightening roar, and keen hunting instincts.',
          'Lizardfolk': 'Reptilian survivalists with natural armor. Can hold their breath, have bite attacks, and craft tools from corpses.',
          'Locathah': 'Fish-like humanoids adapted to water. Have natural armor and can breathe air for limited time outside water.',
          'Loxodon': 'Elephant-like beings with natural armor. Their trunk can be used as a tool or weapon, and they have powerful builds.',
          'Minotaur': 'Bull-headed warriors. Have natural horn attacks, can make goring charges, and use horns for devastating headbutts.',
          'Orc': 'Savage warriors driven by aggression. Can move toward enemies as a bonus action and have powerful, intimidating builds.',
          'Satyr': 'Fey goat-folk who love revelry. Resistant to magic, can leap great distances, and have natural performance skills.',
          'Shifter': 'Descended from lycanthropes. Can shift into a more bestial form temporarily, gaining temporary HP and other benefits based on subrace.',
          'Simic Hybrid': 'Magically enhanced beings with animal traits. Choose adaptations like grappling appendages, underwater breathing, or acid spit.',
          'Tabaxi': 'Cat-like wanderers with natural agility. Have climbing claws, can double their speed in bursts, and possess feline grace.',
          'Tortle': 'Turtle-like beings with natural shell armor. Can retreat into shell for defense and hold breath for extended periods.',
          'Triton': 'Guardians of ocean depths. Amphibious, can communicate with sea creatures, and control water and air magically.',
          'Vedalken': 'Blue-skinned logical beings. Gain advantage on Intelligence, Wisdom, and Charisma saves, and have tireless precision.',
          'Warforged': 'Constructed beings built for war. Don\'t need to sleep, eat, or breathe. Have integrated protection and constructed resilience.',
          'Yuan-ti Pureblood': 'Serpentine humanoids with snake-like features. Immune to poison, resistant to magic, and can speak with serpents.'
        };

        if (raceSelect && raceDesc && subraceSection && subraceSelect) {
          // Remove any existing listener to prevent memory leaks and duplicate handlers
          const oldListener = raceSelect._raceChangeHandler;
          if (oldListener) {
            raceSelect.removeEventListener('change', oldListener);
          }

          // Create new handler and store reference for later removal
          const newHandler = (e) => {
            const selectedRace = e.target.value;

            // Show race description
            if (selectedRace && descriptions[selectedRace]) {
              raceDesc.textContent = descriptions[selectedRace];
              raceDesc.style.display = 'block';
            } else {
              raceDesc.style.display = 'none';
            }

            // Handle subraces
            if (selectedRace && subraces[selectedRace]) {
              subraceSelect.innerHTML = '<option value="">Choose a subrace...</option>';
              subraces[selectedRace].forEach(subrace => {
                const option = document.createElement('option');
                option.value = subrace.value;
                option.textContent = subrace.label;
                subraceSelect.appendChild(option);
              });
              subraceSection.style.display = 'block';
            } else {
              subraceSection.style.display = 'none';
              subraceSelect.innerHTML = '<option value="">Choose a subrace...</option>';
            }

            // Show scaling feature table if available
            const scalingTableDiv = document.getElementById('racialScalingTable');
            const scalingFeatureName = document.getElementById('scalingFeatureName');
            const scalingFeatureDesc = document.getElementById('scalingFeatureDesc');
            const scalingTableBody = document.getElementById('scalingTableBody');
            const scalingFeatureNote = document.getElementById('scalingFeatureNote');

            if (selectedRace && window.LevelUpData && scalingTableDiv && scalingFeatureName && scalingFeatureDesc && scalingTableBody && scalingFeatureNote) {
              const scalingFeature = window.LevelUpData.getRacialScalingFeature(selectedRace);

              if (scalingFeature) {
                scalingFeatureName.textContent = scalingFeature.name;
                scalingFeatureDesc.textContent = scalingFeature.description;
                scalingFeatureNote.textContent = scalingFeature.note || '';

                // Build scaling table
                scalingTableBody.innerHTML = '';
                scalingFeature.scaling.forEach(entry => {
                  const row = document.createElement('tr');
                  row.innerHTML = `
                    <td><strong>${entry.levels}</strong></td>
                    <td>${entry.value}</td>
                  `;
                  scalingTableBody.appendChild(row);
                });

                scalingTableDiv.style.display = 'block';
              } else {
                scalingTableDiv.style.display = 'none';
              }
            } else if (scalingTableDiv) {
              scalingTableDiv.style.display = 'none';
            }
          };

          raceSelect._raceChangeHandler = newHandler;
          raceSelect.addEventListener('change', newHandler);
        }
      }
    },
    {
      title: "Step 3: Choose Your Class",
      content: `
        <h5>Pick your character's class</h5>
        <p>Your class determines your role in the party and what abilities you'll have.</p>
        <div class="mb-3">
          <label for="wizardClass" class="form-label">Class *</label>
          <select class="form-select" id="wizardClass">
            <option value="">Choose a class...</option>
            <optgroup label="Martial Classes">
              <option value="Barbarian">Barbarian - Fierce warrior who rages in battle (Str/Con)</option>
              <option value="Fighter">Fighter - Master of weapons and armor (Str or Dex)</option>
              <option value="Monk">Monk - Unarmed martial artist with ki powers (Dex/Wis)</option>
              <option value="Ranger">Ranger - Wilderness warrior and tracker (Dex/Wis)</option>
              <option value="Rogue">Rogue - Stealthy, skillful, sneaky (Dex)</option>
            </optgroup>
            <optgroup label="Full Spellcasters">
              <option value="Bard">Bard - Charismatic performer with support magic (Cha)</option>
              <option value="Cleric">Cleric - Divine healer and support caster (Wis)</option>
              <option value="Druid">Druid - Nature spellcaster who can wild shape (Wis)</option>
              <option value="Sorcerer">Sorcerer - Innate magic user with metamagic (Cha)</option>
              <option value="Warlock">Warlock - Magic from a powerful patron (Cha)</option>
              <option value="Wizard">Wizard - Arcane scholar with vast spell knowledge (Int)</option>
            </optgroup>
            <optgroup label="Half-Casters (Martial + Magic)">
              <option value="Artificer">Artificer - Magical inventor with infusions (Int)</option>
              <option value="Paladin">Paladin - Holy warrior with divine magic (Str/Cha)</option>
            </optgroup>
          </select>
        </div>
        <div id="classDescription" class="alert alert-info" style="display:none;"></div>
        <div id="classHitDie" class="alert alert-warning" style="display:none;"></div>
        <div id="primaryAbility" class="alert alert-secondary" style="display:none;"></div>
      `,
      buttons: ['Back', 'Next'],
      validate: () => {
        const charClass = document.getElementById('wizardClass')?.value;
        if (!charClass) {
          alert('Please choose a class.');
          return false;
        }
        wizardData.class = charClass;
        return true;
      },
      onShow: () => {
        const classSelect = document.getElementById('wizardClass');
        const classDesc = document.getElementById('classDescription');
        const hitDieInfo = document.getElementById('classHitDie');
        const primaryAbilityInfo = document.getElementById('primaryAbility');

        if (classSelect && classDesc && hitDieInfo && primaryAbilityInfo) {
          // Remove any existing listener to prevent memory leaks and duplicate handlers
          const oldListener = classSelect._classChangeHandler;
          if (oldListener) {
            classSelect.removeEventListener('change', oldListener);
          }

          // Create new handler and store reference for later removal
          const newHandler = (e) => {
            const descriptions = {
              'Artificer': 'Artificers are magical inventors who infuse items with power. They can create magical items, cast spells through tools, and support allies with their creations. Half-caster with unique crafting abilities.',
              'Barbarian': 'Barbarians channel their rage into devastating attacks. They have the highest HP and can take massive damage. Fierce frontline warriors with primal power.',
              'Bard': 'Bards inspire allies with music and magic. They have a mix of support spells, healing, and control. Jack of all trades with expertise in multiple skills.',
              'Cleric': 'Clerics serve a deity and can heal allies and smite foes. Very versatile with access to all cleric spells. Choose a divine domain for specialization.',
              'Druid': 'Druids draw power from nature and can transform into animals with Wild Shape. They have strong crowd control and battlefield manipulation spells.',
              'Fighter': 'Fighters are masters of martial combat. They excel with weapons and armor, getting extra attacks and maneuvers. Great for beginners! Very customizable.',
              'Monk': 'Monks are martial artists who use ki energy for supernatural abilities. Fast, mobile, and can stun enemies. Fight unarmed or with simple weapons.',
              'Paladin': 'Paladins are holy warriors who smite evil and protect the innocent. Half-caster with powerful melee attacks and support abilities. Can heal and boost allies.',
              'Ranger': 'Rangers are skilled hunters and trackers who blend combat with nature magic. Half-caster excellent at ranged combat and surviving in the wilderness.',
              'Rogue': 'Rogues are cunning and precise. They deal massive damage with Sneak Attack and have the most skills. Masters of stealth, lockpicking, and trickery.',
              'Sorcerer': 'Sorcerers have innate magic and can modify their spells with metamagic. Fewer spells known than wizards, but more flexible casting. Choose a sorcerous origin.',
              'Warlock': 'Warlocks made a pact for powerful magic. They regain spell slots on short rests and get Eldritch Blast, the best damage cantrip. Choose a patron.',
              'Wizard': 'Wizards study arcane magic and have the largest spell selection. They learn spells from scrolls and can prepare different spells daily. Fragile but incredibly powerful.'
            };

            const hitDice = {
              'Artificer': 'd8', 'Barbarian': 'd12', 'Bard': 'd8', 'Cleric': 'd8', 'Druid': 'd8',
              'Fighter': 'd10', 'Monk': 'd8', 'Paladin': 'd10', 'Ranger': 'd10', 'Rogue': 'd8',
              'Sorcerer': 'd6', 'Warlock': 'd8', 'Wizard': 'd6'
            };

            const primaryAbilities = {
              'Artificer': 'Intelligence (for spells and infusions)',
              'Barbarian': 'Strength (for attacks), Constitution (for survivability)',
              'Bard': 'Charisma (for spells and social skills)',
              'Cleric': 'Wisdom (for spells and perception)',
              'Druid': 'Wisdom (for spells and wild shape)',
              'Fighter': 'Strength or Dexterity (your choice of fighting style)',
              'Monk': 'Dexterity (for AC and attacks), Wisdom (for ki save DC)',
              'Paladin': 'Strength (for attacks), Charisma (for spells and auras)',
              'Ranger': 'Dexterity (for attacks), Wisdom (for spells and tracking)',
              'Rogue': 'Dexterity (for attacks, AC, and stealth)',
              'Sorcerer': 'Charisma (for spells)',
              'Warlock': 'Charisma (for spells and eldritch invocations)',
              'Wizard': 'Intelligence (for spells and knowledge)'
            };

            if (e.target.value && descriptions[e.target.value]) {
              classDesc.textContent = descriptions[e.target.value];
              classDesc.style.display = 'block';

              hitDieInfo.innerHTML = `<strong>Hit Die:</strong> ${hitDice[e.target.value]} per level. This determines your Hit Points.`;
              hitDieInfo.style.display = 'block';

              primaryAbilityInfo.innerHTML = `<strong>Primary Ability:</strong> ${primaryAbilities[e.target.value]}`;
              primaryAbilityInfo.style.display = 'block';
            } else {
              classDesc.style.display = 'none';
              hitDieInfo.style.display = 'none';
              primaryAbilityInfo.style.display = 'none';
            }
          };

          classSelect._classChangeHandler = newHandler;
          classSelect.addEventListener('change', newHandler);
        }
      }
    },
    {
      title: "Step 4: Choose Your Subclass",
      content: `
        <h5>Select your specialization</h5>
        <p id="subclassIntro">Your subclass defines your character's unique path and abilities.</p>
        <div id="subclassSelectionContainer">
          <!-- Will be populated dynamically based on class and level -->
        </div>
      `,
      buttons: ['Back', 'Next'],
      validate: () => {
        // Check if subclass selection is required
        const needsSubclass = wizardData.subclassRequired;
        if (!needsSubclass) {
          return true; // Skip validation if not needed
        }

        const selectedSubclass = wizardData.subclass;
        if (!selectedSubclass) {
          alert('Please select your subclass.');
          return false;
        }
        return true;
      },
      onShow: () => {
        const container = document.getElementById('subclassSelectionContainer');
        const intro = document.getElementById('subclassIntro');
        if (!container || !intro) return;

        const className = wizardData.class;
        const level = wizardData.level || 1;

        // Level 1 characters don't choose subclasses during creation
        if (level === 1) {
          wizardData.subclassRequired = false;
          container.innerHTML = `
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Subclass selection happens at higher levels. You'll choose your specialization when you level up.
            </div>
          `;
          return;
        }

        // Check if subclass selection is needed at this level
        if (window.LevelUpData && typeof window.LevelUpData.getSubclassSelectionLevel === 'function') {
          const selectionLevel = window.LevelUpData.getSubclassSelectionLevel(className);
          const needsSubclass = selectionLevel && level >= selectionLevel;

          wizardData.subclassRequired = needsSubclass;

          if (!needsSubclass) {
            container.innerHTML = `
              <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                Your ${className} will choose their subclass at level ${selectionLevel || 'N/A'}.
                You can skip this step for now.
              </div>
            `;
            return;
          }

          // Get subclass data
          const subclassData = window.LevelUpData.getSubclassData(className);
          if (!subclassData) {
            container.innerHTML = `
              <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Subclass data not available for ${className}.
              </div>
            `;
            return;
          }

          intro.textContent = `Choose your ${subclassData.name}. This choice is permanent and defines your character's path.`;

          // Render subclass options
          const options = Object.keys(subclassData.options);
          container.innerHTML = `
            <div class="list-group">
              ${options.map(optionName => {
                const option = subclassData.options[optionName];
                const firstFeatures = option.features[selectionLevel] || [];
                return `
                  <label class="list-group-item list-group-item-action bg-dark border-secondary cursor-pointer">
                    <div class="d-flex align-items-start gap-2">
                      <input type="radio" name="wizardSubclass" value="${optionName}"
                             class="form-check-input mt-1 wizard-subclass-radio">
                      <div class="flex-grow-1">
                        <h6 class="mb-1">${option.name}</h6>
                        <p class="mb-2 small text-muted">${option.description}</p>
                        ${firstFeatures.length > 0 ? `
                          <div class="small">
                            <strong>Initial Features (Level ${selectionLevel}):</strong>
                            <ul class="mb-0 mt-1">
                              ${firstFeatures.map(f => `<li>${f}</li>`).join('')}
                            </ul>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          `;

          // Add event listeners to radio buttons
          const radios = container.querySelectorAll('.wizard-subclass-radio');
          radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
              wizardData.subclass = e.target.value;
            });
          });

        } else {
          container.innerHTML = `
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Level-up data not loaded. Please refresh the page.
            </div>
          `;
        }
      }
    },
    {
      title: "Step 5: Ability Scores",
      content: `
        <h5>Roll your ability scores</h5>
        <p>The six ability scores define your character's core attributes. Roll 4d6, drop the lowest die, and assign the results.</p>
        <div class="text-center mb-3">
          <button type="button" class="btn btn-primary btn-lg" id="rollAbilitiesBtn">
            <i class="bi bi-dice-5"></i> Roll All Ability Scores
          </button>
          <p class="text-muted small mt-2">Standard method: Roll 4d6, drop lowest, 6 times</p>
        </div>
        <div id="abilityRolls" class="row g-2 mb-3" style="display:none;">
          <div class="col-12"><h6>Your Rolls (assign these to abilities below):</h6></div>
          <div class="col-12" id="rollResults"></div>
        </div>
        <div class="row g-3">
          <div class="col-md-6">
            <label for="wizardStr" class="form-label">Strength (STR)</label>
            <input type="number" class="form-control" id="wizardStr" min="3" max="18" placeholder="Physical power">
            <div class="form-text small">Melee attacks, carrying capacity</div>
          </div>
          <div class="col-md-6">
            <label for="wizardDex" class="form-label">Dexterity (DEX)</label>
            <input type="number" class="form-control" id="wizardDex" min="3" max="18" placeholder="Agility & reflexes">
            <div class="form-text small">AC, ranged attacks, initiative</div>
          </div>
          <div class="col-md-6">
            <label for="wizardCon" class="form-label">Constitution (CON)</label>
            <input type="number" class="form-control" id="wizardCon" min="3" max="18" placeholder="Endurance">
            <div class="form-text small">Hit points, stamina</div>
          </div>
          <div class="col-md-6">
            <label for="wizardInt" class="form-label">Intelligence (INT)</label>
            <input type="number" class="form-control" id="wizardInt" min="3" max="18" placeholder="Reasoning & memory">
            <div class="form-text small">Wizard spells, investigation</div>
          </div>
          <div class="col-md-6">
            <label for="wizardWis" class="form-label">Wisdom (WIS)</label>
            <input type="number" class="form-control" id="wizardWis" min="3" max="18" placeholder="Awareness & intuition">
            <div class="form-text small">Cleric/Druid spells, perception</div>
          </div>
          <div class="col-md-6">
            <label for="wizardCha" class="form-label">Charisma (CHA)</label>
            <input type="number" class="form-control" id="wizardCha" min="3" max="18" placeholder="Force of personality">
            <div class="form-text small">Bard/Sorcerer/Warlock spells, persuasion</div>
          </div>
        </div>
        <div class="alert alert-info mt-3" id="abilityTips">
          <strong>Tip:</strong> Put your highest scores in the abilities your class uses most!
          <ul class="small mb-0 mt-2">
            <li><strong>Artificer:</strong> Intelligence, then Constitution or Dexterity</li>
            <li><strong>Barbarian:</strong> Strength, then Constitution (most important for survivability)</li>
            <li><strong>Bard:</strong> Charisma, then Dexterity or Constitution</li>
            <li><strong>Cleric:</strong> Wisdom, then Constitution or Strength</li>
            <li><strong>Druid:</strong> Wisdom, then Constitution (you'll wild shape for combat)</li>
            <li><strong>Fighter:</strong> Strength or Dexterity (your choice), then Constitution</li>
            <li><strong>Monk:</strong> Dexterity, then Wisdom (both very important)</li>
            <li><strong>Paladin:</strong> Strength, then Charisma (for spells and auras)</li>
            <li><strong>Ranger:</strong> Dexterity, then Wisdom</li>
            <li><strong>Rogue:</strong> Dexterity (most important), then Intelligence or Charisma</li>
            <li><strong>Sorcerer:</strong> Charisma, then Constitution (you're fragile!)</li>
            <li><strong>Warlock:</strong> Charisma, then Constitution or Dexterity</li>
            <li><strong>Wizard:</strong> Intelligence, then Constitution or Dexterity (you're fragile!)</li>
          </ul>
        </div>
      `,
      buttons: ['Back', 'Next'],
      validate: () => {
        const str = parseInt(document.getElementById('wizardStr')?.value) || 0;
        const dex = parseInt(document.getElementById('wizardDex')?.value) || 0;
        const con = parseInt(document.getElementById('wizardCon')?.value) || 0;
        const int = parseInt(document.getElementById('wizardInt')?.value) || 0;
        const wis = parseInt(document.getElementById('wizardWis')?.value) || 0;
        const cha = parseInt(document.getElementById('wizardCha')?.value) || 0;

        if (str < 3 || dex < 3 || con < 3 || int < 3 || wis < 3 || cha < 3) {
          alert('Please enter all ability scores (minimum 3).');
          return false;
        }

        wizardData.str = str;
        wizardData.dex = dex;
        wizardData.con = con;
        wizardData.int = int;
        wizardData.wis = wis;
        wizardData.cha = cha;
        return true;
      },
      onShow: () => {
        const rollBtn = document.getElementById('rollAbilitiesBtn');
        if (rollBtn) {
          // Remove any existing listener to prevent memory leaks and duplicate handlers
          const oldListener = rollBtn._rollClickHandler;
          if (oldListener) {
            rollBtn.removeEventListener('click', oldListener);
          }

          // Create new handler and store reference for later removal
          const newHandler = () => {
            const rolls = [];
            for (let i = 0; i < 6; i++) {
              const dice = [
                Math.floor(Math.random() * 6) + 1,
                Math.floor(Math.random() * 6) + 1,
                Math.floor(Math.random() * 6) + 1,
                Math.floor(Math.random() * 6) + 1
              ];
              dice.sort((a, b) => b - a);
              const total = dice[0] + dice[1] + dice[2]; // Drop lowest (dice[3])
              rolls.push({ dice: [...dice], total, dropped: dice[3] });
            }

            rolls.sort((a, b) => b.total - a.total);

            const resultsDiv = document.getElementById('rollResults');
            if (resultsDiv) {
              resultsDiv.innerHTML = rolls.map(r =>
                `<span class="badge bg-primary fs-6 me-2 mb-2">
                  ${r.total}
                  <small class="text-white-50">(${r.dice[0]}, ${r.dice[1]}, ${r.dice[2]}, <del>${r.dropped}</del>)</small>
                </span>`
              ).join('');
            }

            document.getElementById('abilityRolls').style.display = 'block';
          };

          rollBtn._rollClickHandler = newHandler;
          rollBtn.addEventListener('click', newHandler);
        }
      }
    },
    {
      title: "Step 6: Ability Score Improvements",
      content: `
        <h5>Choose your Ability Score Improvements or Feats</h5>
        <p id="asiCountMessage">Your character qualifies for ability improvements based on your starting level.</p>
        <div id="asiSelectionsContainer">
          <!-- ASI/Feat selections will be dynamically populated -->
        </div>
      `,
      buttons: ['Back', 'Next'],
      validate: () => {
        // Skip if no ASI needed
        if (!wizardData.asiRequired || wizardData.asiRequired === 0) {
          return true;
        }

        // Check that all ASI choices have been made
        const asiChoices = wizardData.asiChoices || [];
        if (asiChoices.length !== wizardData.asiRequired) {
          alert(`Please make all ${wizardData.asiRequired} ASI/Feat choice(s).`);
          return false;
        }

        // Validate each choice
        for (let i = 0; i < asiChoices.length; i++) {
          const choice = asiChoices[i];
          if (!choice.type) {
            alert(`Please select ASI or Feat for choice ${i + 1}.`);
            return false;
          }

          if (choice.type === 'asi') {
            const total = (choice.increases || []).reduce((sum, inc) => sum + inc.amount, 0);
            if (total !== 2) {
              alert(`ASI choice ${i + 1} must total +2 in ability scores.`);
              return false;
            }
          } else if (choice.type === 'feat') {
            if (!choice.featName) {
              alert(`Please select a feat for choice ${i + 1}.`);
              return false;
            }
          }
        }

        return true;
      },
      onShow: () => {
        // Calculate how many ASI/Feats this character should have
        const level = wizardData.level || 1;
        const className = wizardData.class;

        if (!className || !window.LevelUpData) {
          document.getElementById('asiCountMessage').textContent = 'Unable to determine ASI requirements.';
          return;
        }

        const asiCount = window.LevelUpData.getASICount(className, level);
        wizardData.asiRequired = asiCount;

        if (asiCount === 0) {
          document.getElementById('asiCountMessage').textContent = `At level ${level}, your ${className} has not yet earned any Ability Score Improvements.`;
          document.getElementById('asiSelectionsContainer').innerHTML = '<div class="alert alert-info">No ASI/Feats to select at this level. Click Next to continue.</div>';
          return;
        }

        const asiLevels = window.LevelUpData.getASILevels(className);
        const earnedLevels = asiLevels.filter(lvl => lvl <= level);

        document.getElementById('asiCountMessage').innerHTML = `
          At level ${level}, your ${className} has earned <strong>${asiCount}</strong> Ability Score Improvement(s) or Feat(s).
          <div class="small text-muted mt-1">Earned at levels: ${earnedLevels.join(', ')}</div>
        `;

        // Initialize asiChoices if not already done
        if (!wizardData.asiChoices) {
          wizardData.asiChoices = [];
        }

        // Render ASI/Feat selection UI
        renderASISelections(asiCount);
      }
    },
    {
      title: "Step 7: Choose Your Background",
      content: `
        <h5>Choose your background</h5>
        <p>Your background provides additional skill proficiencies, tool proficiencies, and roleplay hooks.</p>
        <div class="mb-3">
          <label for="wizardBackground" class="form-label">Background *</label>
          <select class="form-select" id="wizardBackground">
            <option value="">Choose a background...</option>
            <option value="Acolyte">Acolyte - Religious servant (+Insight, +Religion)</option>
            <option value="Charlatan">Charlatan - Con artist (+Deception, +Sleight of Hand)</option>
            <option value="Criminal">Criminal - Lawbreaker (+Deception, +Stealth)</option>
            <option value="Entertainer">Entertainer - Performer (+Acrobatics, +Performance)</option>
            <option value="Folk Hero">Folk Hero - Common champion (+Animal Handling, +Survival)</option>
            <option value="Guild Artisan">Guild Artisan - Craftsperson (+Insight, +Persuasion)</option>
            <option value="Hermit">Hermit - Secluded sage (+Medicine, +Religion)</option>
            <option value="Noble">Noble - High born (+History, +Persuasion)</option>
            <option value="Outlander">Outlander - Wilderness survivor (+Athletics, +Survival)</option>
            <option value="Sage">Sage - Scholar and researcher (+Arcana, +History)</option>
            <option value="Sailor">Sailor - Sea voyager (+Athletics, +Perception)</option>
            <option value="Soldier">Soldier - Military veteran (+Athletics, +Intimidation)</option>
            <option value="Urchin">Urchin - Street kid (+Sleight of Hand, +Stealth)</option>
          </select>
        </div>
        <div id="backgroundDescription" class="alert alert-info" style="display:none;"></div>
        <p class="text-muted small mt-3">Your background grants you two additional skill proficiencies and often special features or contacts.</p>
      `,
      buttons: ['Back', 'Next'],
      validate: () => {
        const background = document.getElementById('wizardBackground')?.value;
        if (!background) {
          alert('Please choose a background.');
          return false;
        }
        wizardData.background = background;
        return true;
      },
      onShow: () => {
        const backgroundSelect = document.getElementById('wizardBackground');
        const backgroundDesc = document.getElementById('backgroundDescription');

        const descriptions = {
          'Acolyte': 'You served in a temple, learning religious rites and tending to the faithful. You have connections to priests and temples.',
          'Charlatan': 'You made your way in the world through trickery and deception. You can fake credentials and identities.',
          'Criminal': 'You have a history of breaking the law. You have contact with criminal underworld networks.',
          'Entertainer': 'You thrived in front of audiences. You can always find a place to perform for room and board.',
          'Folk Hero': 'You stood up to tyrants and monsters. Common folk will shelter and protect you.',
          'Guild Artisan': 'You learned a trade through a guild. You have guild membership and can get lodging through the guild.',
          'Hermit': 'You lived in seclusion to seek enlightenment. You discovered an important spiritual truth or secret.',
          'Noble': 'You come from privilege and high society. People defer to you, and you can secure audiences with nobility.',
          'Outlander': 'You grew up in the wilds. You have excellent memory for geography and can find food/water for yourself and others.',
          'Sage': 'You spent years learning lore and secrets. You know how to find information and can figure out where to learn things.',
          'Sailor': 'You sailed the seas or rivers. You can secure free passage on ships and have knowledge of ports.',
          'Soldier': 'You served in an army. You have rank and can get help from soldiers. You know military structure.',
          'Urchin': 'You grew up poor on streets. You know secret city paths and can move quickly through urban areas.'
        };

        if (backgroundSelect && backgroundDesc) {
          const oldListener = backgroundSelect._backgroundChangeHandler;
          if (oldListener) {
            backgroundSelect.removeEventListener('change', oldListener);
          }

          const newHandler = (e) => {
            if (e.target.value && descriptions[e.target.value]) {
              backgroundDesc.textContent = descriptions[e.target.value];
              backgroundDesc.style.display = 'block';
            } else {
              backgroundDesc.style.display = 'none';
            }
          };

          backgroundSelect._backgroundChangeHandler = newHandler;
          backgroundSelect.addEventListener('change', newHandler);
        }
      }
    },
    {
      title: "Step 8: Skills & Proficiencies",
      content: `
        <h5>Choose your skill proficiencies</h5>
        <p id="skillSelectionInstructions">Select the skills your class grants you.</p>
        <div id="skillSelectionContainer" class="mb-3">
          <!-- Skills will be dynamically populated -->
        </div>
        <div class="alert alert-info">
          <strong>Note:</strong> Your background also grants 2 additional skills (shown in previous step).
          Those will be automatically added along with your class skills.
        </div>
      `,
      buttons: ['Back', 'Next'],
      validate: () => {
        const selectedSkills = Array.from(document.querySelectorAll('input[name="classSkill"]:checked'))
          .map(cb => cb.value);

        const requiredCount = wizardData.classSkillCount || 2;
        if (selectedSkills.length !== requiredCount) {
          alert(`Please select exactly ${requiredCount} skill(s) for your class.`);
          return false;
        }

        wizardData.classSkills = selectedSkills;
        return true;
      },
      onShow: () => {
        // Define skills available per class and how many to pick
        const classSkills = {
          'Artificer': { count: 2, skills: ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Sleight of Hand'] },
          'Barbarian': { count: 2, skills: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'] },
          'Bard': { count: 3, skills: ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'] },
          'Cleric': { count: 2, skills: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'] },
          'Druid': { count: 2, skills: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'] },
          'Fighter': { count: 2, skills: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'] },
          'Monk': { count: 2, skills: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'] },
          'Paladin': { count: 2, skills: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'] },
          'Ranger': { count: 3, skills: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'] },
          'Rogue': { count: 4, skills: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'] },
          'Sorcerer': { count: 2, skills: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'] },
          'Warlock': { count: 2, skills: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'] },
          'Wizard': { count: 2, skills: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'] }
        };

        const charClass = wizardData.class;
        const classData = classSkills[charClass] || { count: 2, skills: [] };
        wizardData.classSkillCount = classData.count;

        const instructionEl = document.getElementById('skillSelectionInstructions');
        const containerEl = document.getElementById('skillSelectionContainer');

        if (instructionEl) {
          instructionEl.textContent = `As a ${charClass}, choose ${classData.count} skill proficiencies from the list below:`;
        }

        if (containerEl) {
          containerEl.innerHTML = '';
          classData.skills.forEach(skill => {
            const div = document.createElement('div');
            div.className = 'form-check';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.name = 'classSkill';
            checkbox.value = skill;
            checkbox.id = `skill-${skill}`;

            // Limit selection
            checkbox.addEventListener('change', () => {
              const checked = document.querySelectorAll('input[name="classSkill"]:checked');
              if (checked.length > classData.count) {
                checkbox.checked = false;
              }
            });

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `skill-${skill}`;
            label.textContent = skill;

            div.appendChild(checkbox);
            div.appendChild(label);
            containerEl.appendChild(div);
          });
        }
      }
    },
    {
      title: "Step 9: Hit Points & Combat Stats",
      content: `
        <h5>Calculate your starting stats</h5>
        <p>We'll automatically calculate your HP, AC, and other combat statistics.</p>

        <div class="mb-3">
          <label class="form-label"><strong>Hit Points</strong></label>
          <div id="hpCalculation" class="alert alert-secondary">
            <!-- Will be populated dynamically -->
          </div>
          <div id="hpMethodSelection" class="mt-3" style="display:none;">
            <!-- HP method selection for multi-level characters -->
          </div>
          <div class="form-text" id="hpCalculationNote">At 1st level, you get maximum HP from your hit die plus your Constitution modifier.</div>
        </div>

        <div class="mb-3">
          <label class="form-label"><strong>Armor Class (AC)</strong></label>
          <p class="small">Choose your starting armor:</p>
          <div id="armorSelection">
            <!-- Will be populated dynamically based on class -->
          </div>
          <div id="acCalculation" class="alert alert-secondary mt-2" style="display:none;">
            <!-- AC will be calculated -->
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label"><strong>Speed</strong></label>
          <div id="speedDisplay" class="alert alert-secondary">
            <!-- Will be populated based on race -->
          </div>
        </div>

        <div class="alert alert-info">
          <strong>Proficiency Bonus:</strong> <span id="profBonusDisplay">+2</span> (based on your level)
        </div>
      `,
      buttons: ['Back', 'Next'],
      validate: () => {
        const level = wizardData.level || 1;

        // Check if HP is properly calculated for multi-level characters
        if (level > 1 && wizardData.hpMethod === 'roll' && (!wizardData.hpRolls || wizardData.hpRolls.length !== level - 1)) {
          alert('Please roll for HP or select "Take Average".');
          return false;
        }

        const selectedArmor = document.querySelector('input[name="startingArmor"]:checked');
        if (!selectedArmor) {
          alert('Please select your starting armor.');
          return false;
        }
        wizardData.startingArmor = selectedArmor.value;
        return true;
      },
      onShow: () => {
        // Calculate HP
        const hitDice = {
          'Artificer': 8, 'Barbarian': 12, 'Bard': 8, 'Cleric': 8, 'Druid': 8,
          'Fighter': 10, 'Monk': 8, 'Paladin': 10, 'Ranger': 10, 'Rogue': 8,
          'Sorcerer': 6, 'Warlock': 8, 'Wizard': 6
        };

        const conMod = Math.floor((wizardData.con - 10) / 2);
        const hitDie = hitDice[wizardData.class] || 8;
        const level = wizardData.level || 1;

        // Level 1 HP calculation (always max)
        const level1HP = hitDie + conMod;

        // For higher levels, show HP options
        const hpCalc = document.getElementById('hpCalculation');
        const hpMethodSelection = document.getElementById('hpMethodSelection');
        const hpCalculationNote = document.getElementById('hpCalculationNote');

        if (level === 1) {
          // Simple level 1 calculation
          wizardData.maxHP = level1HP;
          wizardData.currentHP = level1HP;
          wizardData.hitDie = `1d${hitDie}`;

          if (hpCalc) {
            hpCalc.innerHTML = `<strong>Maximum HP:</strong> ${level1HP} (${hitDie} from ${wizardData.class} hit die + ${conMod} CON modifier)`;
          }
          if (hpMethodSelection) hpMethodSelection.style.display = 'none';
          if (hpCalculationNote) hpCalculationNote.textContent = 'At 1st level, you get maximum HP from your hit die plus your Constitution modifier.';
        } else {
          // Multi-level calculation with options
          const avgPerLevel = Math.floor(hitDie / 2) + 1;
          const rollMin = 1 + conMod;
          const rollMax = hitDie + conMod;
          const avgHPTotal = level1HP + ((avgPerLevel + conMod) * (level - 1));

          // Initialize HP method tracking
          if (!wizardData.hpMethod) wizardData.hpMethod = 'average'; // Default to average
          if (!wizardData.hpRolls) wizardData.hpRolls = [];

          if (hpCalc) {
            hpCalc.innerHTML = `<strong>Level 1 HP:</strong> ${level1HP} (${hitDie} + ${conMod} CON)`;
          }

          if (hpCalculationNote) {
            hpCalculationNote.textContent = `You're creating a level ${level} character. Choose how to calculate HP for levels 2-${level}:`;
          }

          if (hpMethodSelection) {
            hpMethodSelection.style.display = 'block';
            hpMethodSelection.innerHTML = `
              <div class="row g-3">
                <div class="col-md-6">
                  <div class="card bg-secondary bg-opacity-25 border-secondary h-100">
                    <div class="card-body">
                      <h6 class="card-title">
                        <input type="radio" name="hpMethodWizard" value="roll" id="hpMethodRollWizard"
                               class="form-check-input me-2" ${wizardData.hpMethod === 'roll' ? 'checked' : ''} />
                        <label for="hpMethodRollWizard">Roll Hit Dice</label>
                      </h6>
                      <p class="text-muted small mb-2">Roll ${level - 1}×1d${hitDie} + ${conMod} per level</p>
                      <button type="button" class="btn btn-sm btn-outline-warning" id="rollAllHPBtn">
                        <i class="bi bi-dice-5 me-1"></i>Roll for Levels 2-${level}
                      </button>
                      <div id="hpRollResults" class="mt-2 small"></div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="card bg-secondary bg-opacity-25 border-secondary h-100">
                    <div class="card-body">
                      <h6 class="card-title">
                        <input type="radio" name="hpMethodWizard" value="average" id="hpMethodAverageWizard"
                               class="form-check-input me-2" ${wizardData.hpMethod === 'average' ? 'checked' : ''} />
                        <label for="hpMethodAverageWizard">Take Average (Recommended)</label>
                      </h6>
                      <p class="text-muted small mb-2">Guaranteed ${avgPerLevel} + ${conMod} per level</p>
                      <div class="alert alert-success text-light mb-0">
                        <strong>Total HP:</strong> ${avgHPTotal}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div id="totalHPDisplay" class="alert alert-info mt-3">
                <strong>Total Maximum HP:</strong> <span id="totalHPValue">${avgHPTotal}</span>
              </div>
            `;

            // Set up event listeners for HP method selection
            const rollRadio = document.getElementById('hpMethodRollWizard');
            const avgRadio = document.getElementById('hpMethodAverageWizard');
            const rollBtn = document.getElementById('rollAllHPBtn');
            const rollResults = document.getElementById('hpRollResults');
            const totalHPValue = document.getElementById('totalHPValue');

            const updateHPDisplay = () => {
              if (wizardData.hpMethod === 'average') {
                totalHPValue.textContent = avgHPTotal;
                wizardData.maxHP = avgHPTotal;
                wizardData.currentHP = avgHPTotal;
              } else if (wizardData.hpMethod === 'roll' && wizardData.hpRolls.length === level - 1) {
                const rolledTotal = level1HP + wizardData.hpRolls.reduce((sum, r) => sum + r.total, 0);
                totalHPValue.textContent = rolledTotal;
                wizardData.maxHP = rolledTotal;
                wizardData.currentHP = rolledTotal;
              }
            };

            rollRadio?.addEventListener('change', () => {
              wizardData.hpMethod = 'roll';
              rollResults.innerHTML = '';
              wizardData.hpRolls = [];
              totalHPValue.textContent = '(Roll Required)';
            });

            avgRadio?.addEventListener('change', () => {
              wizardData.hpMethod = 'average';
              rollResults.innerHTML = '';
              wizardData.hpRolls = [];
              updateHPDisplay();
            });

            rollBtn?.addEventListener('click', () => {
              wizardData.hpRolls = [];
              let resultsHTML = '<div class="alert alert-info text-light mb-0"><strong>HP Rolls:</strong><ul class="mb-0 mt-2">';

              for (let i = 2; i <= level; i++) {
                const roll = Math.floor(Math.random() * hitDie) + 1;
                const total = roll + conMod;
                wizardData.hpRolls.push({ level: i, roll, conMod, total });
                resultsHTML += `<li>Level ${i}: ${roll} + ${conMod} = <strong>${total} HP</strong></li>`;
              }

              const rolledTotal = level1HP + wizardData.hpRolls.reduce((sum, r) => sum + r.total, 0);
              resultsHTML += `</ul><div class="mt-2 pt-2 border-top"><strong>Total HP:</strong> ${rolledTotal}</div></div>`;

              rollResults.innerHTML = resultsHTML;
              updateHPDisplay();
            });

            // Initialize display
            updateHPDisplay();

            // If already rolled, display results
            if (wizardData.hpMethod === 'roll' && wizardData.hpRolls.length === level - 1) {
              let resultsHTML = '<div class="alert alert-info text-light mb-0"><strong>HP Rolls:</strong><ul class="mb-0 mt-2">';
              wizardData.hpRolls.forEach(r => {
                resultsHTML += `<li>Level ${r.level}: ${r.roll} + ${r.conMod} = <strong>${r.total} HP</strong></li>`;
              });
              const rolledTotal = level1HP + wizardData.hpRolls.reduce((sum, r) => sum + r.total, 0);
              resultsHTML += `</ul><div class="mt-2 pt-2 border-top"><strong>Total HP:</strong> ${rolledTotal}</div></div>`;
              rollResults.innerHTML = resultsHTML;
            }
          }

          // Set hit dice count to match level
          wizardData.hitDie = `${level}d${hitDie}`;
        }

        // Calculate Speed
        const racialSpeeds = {
          'Human': 30, 'Elf': 30, 'Dwarf': 25, 'Halfling': 25, 'Dragonborn': 30,
          'Gnome': 25, 'Half-Elf': 30, 'Half-Orc': 30, 'Tiefling': 30,
          'Aarakocra': 25, 'Aasimar': 30, 'Bugbear': 30, 'Centaur': 40,
          'Changeling': 30, 'Firbolg': 30, 'Genasi (Air)': 30, 'Genasi (Earth)': 30,
          'Genasi (Fire)': 30, 'Genasi (Water)': 30, 'Goblin': 30, 'Goliath': 30,
          'Grung': 25, 'Hobgoblin': 30, 'Kalashtar': 30, 'Kenku': 30,
          'Kobold': 30, 'Leonin': 35, 'Lizardfolk': 30, 'Locathah': 10,
          'Loxodon': 30, 'Minotaur': 30, 'Orc': 30, 'Satyr': 35,
          'Shifter': 30, 'Simic Hybrid': 30, 'Tabaxi': 30, 'Tortle': 30,
          'Triton': 30, 'Vedalken': 30, 'Warforged': 30, 'Yuan-ti Pureblood': 30
        };

        let baseSpeed = racialSpeeds[wizardData.race] || 30;
        // Wood Elf gets +5 speed
        if (wizardData.subrace === 'Wood Elf') baseSpeed = 35;

        wizardData.speed = baseSpeed;

        const speedDisplay = document.getElementById('speedDisplay');
        if (speedDisplay) {
          let speedText = `<strong>${baseSpeed} feet</strong>`;
          if (wizardData.race === 'Aarakocra') {
            speedText += ' (walking), 50 feet (flying)';
          }
          speedDisplay.innerHTML = speedText;
        }

        // Proficiency bonus
        const profBonus = Math.floor((wizardData.level - 1) / 4) + 2;
        wizardData.proficiencyBonus = profBonus;

        const profDisplay = document.getElementById('profBonusDisplay');
        if (profDisplay) {
          profDisplay.textContent = `+${profBonus}`;
        }

        // Armor selection based on class
        const armorSelection = document.getElementById('armorSelection');
        const acCalculation = document.getElementById('acCalculation');

        const classArmor = {
          'Artificer': [
            { name: 'Scale Mail', ac: 14, desc: 'Medium armor (AC 14 + DEX mod, max +2)' },
            { name: 'Studded Leather', ac: 12, desc: 'Light armor (AC 12 + DEX mod)' }
          ],
          'Barbarian': [
            { name: 'Unarmored', ac: 10, desc: 'Unarmored Defense (10 + DEX mod + CON mod)' },
            { name: 'Hide Armor', ac: 12, desc: 'Medium armor (AC 12 + DEX mod, max +2)' }
          ],
          'Bard': [
            { name: 'Leather Armor', ac: 11, desc: 'Light armor (AC 11 + DEX mod)' }
          ],
          'Cleric': [
            { name: 'Chain Mail', ac: 16, desc: 'Heavy armor (AC 16, no DEX bonus)' },
            { name: 'Scale Mail + Shield', ac: 16, desc: 'Medium armor (AC 14 + DEX mod, max +2) + Shield (+2)' }
          ],
          'Druid': [
            { name: 'Leather Armor + Shield', ac: 13, desc: 'Light armor (AC 11 + DEX mod) + Shield (+2)' }
          ],
          'Fighter': [
            { name: 'Chain Mail', ac: 16, desc: 'Heavy armor (AC 16, no DEX bonus)' },
            { name: 'Leather Armor', ac: 11, desc: 'Light armor (AC 11 + DEX mod) for DEX fighters' }
          ],
          'Monk': [
            { name: 'Unarmored', ac: 10, desc: 'Unarmored Defense (10 + DEX mod + WIS mod)' }
          ],
          'Paladin': [
            { name: 'Chain Mail + Shield', ac: 18, desc: 'Heavy armor (AC 16) + Shield (+2)' }
          ],
          'Ranger': [
            { name: 'Scale Mail', ac: 14, desc: 'Medium armor (AC 14 + DEX mod, max +2)' },
            { name: 'Leather Armor', ac: 11, desc: 'Light armor (AC 11 + DEX mod)' }
          ],
          'Rogue': [
            { name: 'Leather Armor', ac: 11, desc: 'Light armor (AC 11 + DEX mod)' }
          ],
          'Sorcerer': [
            { name: 'Unarmored', ac: 10, desc: 'No armor (10 + DEX mod)' }
          ],
          'Warlock': [
            { name: 'Leather Armor', ac: 11, desc: 'Light armor (AC 11 + DEX mod)' }
          ],
          'Wizard': [
            { name: 'Unarmored', ac: 10, desc: 'No armor (10 + DEX mod)' }
          ]
        };

        const armorOptions = classArmor[wizardData.class] || [{ name: 'Unarmored', ac: 10, desc: 'No armor (10 + DEX mod)' }];

        if (armorSelection) {
          armorSelection.innerHTML = '';
          armorOptions.forEach((armor, index) => {
            const div = document.createElement('div');
            div.className = 'form-check';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.className = 'form-check-input';
            radio.name = 'startingArmor';
            radio.value = armor.name;
            radio.id = `armor-${index}`;
            if (index === 0) radio.checked = true;

            radio.addEventListener('change', () => {
              // Calculate AC
              const dexMod = Math.floor((wizardData.dex - 10) / 2);
              const conMod = Math.floor((wizardData.con - 10) / 2);
              const wisMod = Math.floor((wizardData.wis - 10) / 2);

              let totalAC = armor.ac;

              if (armor.name === 'Unarmored' && wizardData.class === 'Barbarian') {
                totalAC = 10 + dexMod + conMod;
              } else if (armor.name === 'Unarmored' && wizardData.class === 'Monk') {
                totalAC = 10 + dexMod + wisMod;
              } else if (armor.name === 'Unarmored' || armor.desc.includes('Light armor')) {
                totalAC = armor.ac + dexMod;
              } else if (armor.desc.includes('Medium armor')) {
                totalAC = armor.ac + Math.min(dexMod, 2);
              }
              // Heavy armor doesn't add DEX

              wizardData.ac = totalAC;

              if (acCalculation) {
                acCalculation.innerHTML = `<strong>Your AC:</strong> ${totalAC}`;
                acCalculation.style.display = 'block';
              }
            });

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `armor-${index}`;
            label.innerHTML = `<strong>${armor.name}</strong> - ${armor.desc}`;

            div.appendChild(radio);
            div.appendChild(label);
            armorSelection.appendChild(div);
          });

          // Trigger first option to calculate AC
          const firstRadio = document.querySelector('input[name="startingArmor"]');
          if (firstRadio) firstRadio.dispatchEvent(new Event('change'));
        }
      }
    },
    {
      title: "Step 10: Learn Starting Spells",
      content: `
        <h5>Select your starting spells</h5>
        <div id="spellLearningContainer">
          <!-- Will be populated dynamically based on class and level -->
        </div>
      `,
      buttons: ['Back', 'Next'],
      validate: () => {
        // Skip if not a spellcaster
        if (!wizardData.isSpellcaster) return true;

        // Check if required cantrips are selected
        const requiredCantrips = wizardData.requiredCantrips || 0;
        const selectedCantrips = wizardData.selectedCantrips || [];

        if (selectedCantrips.length < requiredCantrips) {
          alert(`Please select ${requiredCantrips - selectedCantrips.length} more cantrip${requiredCantrips - selectedCantrips.length > 1 ? 's' : ''}.`);
          return false;
        }

        // Check if required spells are selected
        const requiredSpells = wizardData.requiredStartingSpells || 0;
        const selectedSpells = wizardData.selectedSpells || [];

        if (selectedSpells.length < requiredSpells) {
          alert(`Please select ${requiredSpells - selectedSpells.length} more spell${requiredSpells - selectedSpells.length > 1 ? 's' : ''}.`);
          return false;
        }

        return true;
      },
      onShow: () => {
        const container = document.getElementById('spellLearningContainer');
        if (!container) return;

        // Check if character is a spellcaster
        const spellcastingClasses = ['Wizard', 'Sorcerer', 'Bard', 'Warlock', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Artificer'];
        const isSpellcaster = spellcastingClasses.includes(wizardData.class);

        if (!isSpellcaster) {
          container.innerHTML = `
            <div class="alert alert-info">
              <p>${wizardData.class}s don't learn spells at character creation.</p>
              <p>You can proceed to the next step!</p>
            </div>
          `;
          wizardData.isSpellcaster = false;
          return;
        }

        wizardData.isSpellcaster = true;

        // Determine spell learning rules
        let spellsToLearn = 0;
        let cantripsToLearn = 0;
        let maxSpellLevel = 0;
        let isPreparedCaster = false;

        if (wizardData.class === 'Wizard') {
          spellsToLearn = 6; // Wizards start with 6 1st-level spells
          cantripsToLearn = 3;
          maxSpellLevel = 1;
        } else if (wizardData.class === 'Sorcerer') {
          spellsToLearn = 2; // Sorcerers start with 2 1st-level spells
          cantripsToLearn = 4;
          maxSpellLevel = 1;
        } else if (wizardData.class === 'Bard') {
          spellsToLearn = 4; // Bards start with 4 1st-level spells
          cantripsToLearn = 2;
          maxSpellLevel = 1;
        } else if (wizardData.class === 'Warlock') {
          spellsToLearn = 2; // Warlocks start with 2 1st-level spells
          cantripsToLearn = 2;
          maxSpellLevel = 1;
        } else if (wizardData.class === 'Cleric' || wizardData.class === 'Druid') {
          // Prepared casters have access to all spells, but prepare a subset
          isPreparedCaster = true;
          const wisModifier = Math.floor((wizardData.abilityScores?.wis || 10) - 10) / 2;
          const spellsToPrepare = Math.max(1, Math.floor(wisModifier) + wizardData.level);

          spellsToLearn = spellsToPrepare;
          cantripsToLearn = wizardData.class === 'Cleric' ? 3 : 2; // Clerics get 3 cantrips, Druids get 2
          maxSpellLevel = 1;

          // Adjust max spell level for higher levels
          if (wizardData.level >= 17) maxSpellLevel = 9;
          else if (wizardData.level >= 15) maxSpellLevel = 8;
          else if (wizardData.level >= 13) maxSpellLevel = 7;
          else if (wizardData.level >= 11) maxSpellLevel = 6;
          else if (wizardData.level >= 9) maxSpellLevel = 5;
          else if (wizardData.level >= 7) maxSpellLevel = 4;
          else if (wizardData.level >= 5) maxSpellLevel = 3;
          else if (wizardData.level >= 3) maxSpellLevel = 2;

          // Continue to spell selection UI below (don't return early)
        } else if (wizardData.class === 'Paladin') {
          // Paladins don't get spells at level 1
          if (wizardData.level === 1) {
            container.innerHTML = `
              <div class="alert alert-info">
                <p>Paladins don't gain spellcasting until <strong>level 2</strong>.</p>
                <p>You can proceed to the next step!</p>
              </div>
            `;
            wizardData.isSpellcaster = false;
            return;
          } else {
            // Level 2+ Paladins are prepared casters
            isPreparedCaster = true;
            const chaModifier = Math.floor((wizardData.abilityScores?.cha || 10) - 10) / 2;
            const spellsToPrepare = Math.max(1, Math.floor(chaModifier) + Math.floor(wizardData.level / 2));

            spellsToLearn = spellsToPrepare;
            cantripsToLearn = 0; // Paladins don't get cantrips
            maxSpellLevel = 1;

            // Paladins are half-casters, max spell level = 5
            if (wizardData.level >= 17) maxSpellLevel = 5;
            else if (wizardData.level >= 13) maxSpellLevel = 4;
            else if (wizardData.level >= 9) maxSpellLevel = 3;
            else if (wizardData.level >= 5) maxSpellLevel = 2;

            // Continue to spell selection UI below (don't return early)
          }
        } else if (wizardData.class === 'Ranger') {
          // Rangers don't get spells at level 1
          if (wizardData.level === 1) {
            container.innerHTML = `
              <div class="alert alert-info">
                <p>Rangers don't gain spellcasting until <strong>level 2</strong>.</p>
                <p>You can proceed to the next step!</p>
              </div>
            `;
            wizardData.isSpellcaster = false;
            return;
          } else {
            spellsToLearn = 2; // Rangers learn 2 spells at level 2
            maxSpellLevel = 1;
          }
        } else if (wizardData.class === 'Artificer') {
          // Artificers are prepared casters (half-caster progression)
          isPreparedCaster = true;
          const intModifier = Math.floor((wizardData.abilityScores?.int || 10) - 10) / 2;
          const spellsToPrepare = Math.max(1, Math.floor(intModifier) + Math.floor(wizardData.level / 2));

          spellsToLearn = spellsToPrepare;
          cantripsToLearn = 2;
          maxSpellLevel = 1;

          // Artificers are half-casters, max spell level = 5
          if (wizardData.level >= 17) maxSpellLevel = 5;
          else if (wizardData.level >= 13) maxSpellLevel = 4;
          else if (wizardData.level >= 9) maxSpellLevel = 3;
          else if (wizardData.level >= 5) maxSpellLevel = 2;

          // Continue to spell selection UI below (don't return early)
        }

        // Adjust for higher starting levels
        if (wizardData.level > 1 && wizardData.class === 'Wizard') {
          spellsToLearn = 6 + (wizardData.level - 1) * 2; // 2 spells per level
        } else if (wizardData.level > 1 && (wizardData.class === 'Sorcerer' || wizardData.class === 'Bard' || wizardData.class === 'Warlock')) {
          // These classes gain spells at specific levels
          const spellsKnownByLevel = {
            'Sorcerer': [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
            'Bard': [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
            'Warlock': [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15]
          };
          spellsToLearn = spellsKnownByLevel[wizardData.class][wizardData.level] || spellsToLearn;
        }

        // Set max spell level based on character level
        if (wizardData.level >= 17) maxSpellLevel = 9;
        else if (wizardData.level >= 15) maxSpellLevel = 8;
        else if (wizardData.level >= 13) maxSpellLevel = 7;
        else if (wizardData.level >= 11) maxSpellLevel = 6;
        else if (wizardData.level >= 9) maxSpellLevel = 5;
        else if (wizardData.level >= 7) maxSpellLevel = 4;
        else if (wizardData.level >= 5) maxSpellLevel = 3;
        else if (wizardData.level >= 3) maxSpellLevel = 2;
        else maxSpellLevel = 1;

        wizardData.requiredStartingSpells = spellsToLearn;
        wizardData.requiredCantrips = cantripsToLearn;
        wizardData.selectedSpells = [];
        wizardData.selectedCantrips = [];

        // Build the spell selection UI
        const spellAction = isPreparedCaster ? 'prepare' : 'learn';
        const spellNoun = isPreparedCaster ? 'Preparation' : 'Learning';

        container.innerHTML = `
          <div class="alert ${isPreparedCaster ? 'alert-info' : 'alert-primary'}">
            <p><strong>${wizardData.class} Spell ${spellNoun}:</strong></p>
            ${isPreparedCaster ? `<p class="small mb-2">As a <strong>prepared caster</strong>, you have access to the full ${wizardData.class} spell list! You can ${spellAction} different spells after each long rest.</p>` : ''}
            <ul class="mb-0">
              ${cantripsToLearn > 0 ? `<li>Select <strong>${cantripsToLearn} cantrips</strong></li>` : ''}
              ${spellsToLearn > 0 ? `<li>${isPreparedCaster ? 'Prepare' : 'Select'} <strong>${spellsToLearn} spells</strong> of level ${maxSpellLevel} or lower ${isPreparedCaster ? '(can change daily)' : ''}</li>` : ''}
            </ul>
          </div>

          ${cantripsToLearn > 0 ? `
            <div class="mb-4">
              <h6>Cantrips</h6>
              <div class="input-group input-group-sm mb-2">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input type="text" id="cantripSearch" class="form-control" placeholder="Search cantrips...">
              </div>
              <div id="cantripList" style="max-height: 200px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 0.25rem; padding: 0.5rem;">
                <!-- Cantrips will be loaded here -->
              </div>
              <div class="mt-2">
                <strong>Selected:</strong> <span id="selectedCantripCount" class="badge bg-primary">0/${cantripsToLearn}</span>
                <div id="selectedCantripsList" class="mt-1"></div>
              </div>
            </div>
          ` : ''}

          ${spellsToLearn > 0 ? `
            <div class="mb-4">
              <h6>Spells (Level 1-${maxSpellLevel})</h6>
              <div class="input-group input-group-sm mb-2">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input type="text" id="spellSearch" class="form-control" placeholder="Search spells...">
                <select id="spellLevelFilter" class="form-select" style="max-width: 150px;">
                  <option value="all">All Levels</option>
                  ${Array.from({length: maxSpellLevel}, (_, i) => i + 1).map(lvl =>
                    `<option value="${lvl}">Level ${lvl}</option>`
                  ).join('')}
                </select>
              </div>
              <div id="spellList" style="max-height: 300px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 0.25rem; padding: 0.5rem;">
                <!-- Spells will be loaded here -->
              </div>
              <div class="mt-2">
                <strong>Selected:</strong> <span id="selectedSpellCount" class="badge bg-primary">0/${spellsToLearn}</span>
                <div id="selectedSpellsList" class="mt-1"></div>
              </div>
            </div>
          ` : ''}
        `;

        // Load spell data and populate lists
        if (window.SPELLS_DATA) {
          renderWizardSpells(wizardData.class, maxSpellLevel, cantripsToLearn, spellsToLearn);
        } else {
          container.innerHTML += '<div class="alert alert-danger">Error: Spell database not loaded.</div>';
        }
      }
    },
    {
      title: "Step 11: Review & Finish",
      content: `
        <h5>Review your character</h5>
        <p>Here's a summary of your character. Click "Create Character" to finish!</p>

        <div id="characterSummary" class="alert alert-dark">
          <!-- Will be populated with character summary -->
        </div>

        <div class="alert alert-success">
          <strong>What happens next:</strong>
          <ul class="mb-0">
            <li>Your character sheet will be automatically filled out with all your choices</li>
            <li>HP, AC, proficiency bonus, and saving throws will be calculated</li>
            <li>Skill proficiencies from your class and background will be marked</li>
            <li>You can then add equipment, spells, and additional details</li>
          </ul>
        </div>
      `,
      buttons: ['Back', 'Create Character'],
      validate: () => {
        return true;
      },
      onShow: () => {
        const summary = document.getElementById('characterSummary');
        if (summary) {
          const subraceTxt = wizardData.subrace ? ` (${wizardData.subrace})` : '';
          const backgroundTxt = wizardData.background || 'None';

          summary.innerHTML = `
            <h6><strong>${wizardData.name}</strong></h6>
            <p class="mb-2">
              <strong>Race:</strong> ${wizardData.race}${subraceTxt}<br>
              <strong>Class:</strong> ${wizardData.class}, Level ${wizardData.level}<br>
              <strong>Background:</strong> ${backgroundTxt}<br>
              <strong>Alignment:</strong> ${wizardData.alignment || 'Not chosen'}
            </p>
            <p class="mb-2">
              <strong>Ability Scores:</strong><br>
              STR ${wizardData.str} | DEX ${wizardData.dex} | CON ${wizardData.con} |
              INT ${wizardData.int} | WIS ${wizardData.wis} | CHA ${wizardData.cha}
            </p>
            <p class="mb-2">
              <strong>Combat Stats:</strong><br>
              HP: ${wizardData.maxHP} | AC: ${wizardData.ac} | Speed: ${wizardData.speed} ft | Prof. Bonus: +${wizardData.proficiencyBonus}
            </p>
            <p class="mb-0">
              <strong>Skills:</strong> ${wizardData.classSkills ? wizardData.classSkills.join(', ') : 'None selected'}
              (+ 2 from background)
            </p>
          `;
        }
      }
    }
  ];

  function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  function openWizard() {
    console.log('🪄 Opening Character Creation Wizard');
    currentStep = 0;
    wizardData = {};

    const modal = document.getElementById('characterCreationModal');
    if (modal) {
      console.log('✅ Modal found, showing wizard');
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
      renderStep();
    } else {
      console.error('❌ Character creation modal not found in DOM');
    }
  }

  function renderStep() {
    const step = steps[currentStep];

    document.getElementById('wizardTitle').textContent = step.title;
    document.getElementById('wizardBody').innerHTML = step.content;

    // Render buttons
    const footer = document.getElementById('wizardFooter');
    footer.innerHTML = '';

    const progressText = document.createElement('span');
    progressText.className = 'text-muted small me-auto';
    progressText.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    footer.appendChild(progressText);

    step.buttons.forEach(btnText => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = btnText === 'Back' ? 'btn btn-secondary' : 'btn btn-primary';
      btn.textContent = btnText;
      btn.addEventListener('click', () => handleButtonClick(btnText));
      footer.appendChild(btn);
    });

    // Call onShow if it exists
    if (step.onShow) {
      setTimeout(() => step.onShow(), 100);
    }
  }

  function handleButtonClick(action) {
    console.log('🔘 Button clicked:', action);

    if (action === 'Back') {
      if (currentStep > 0) {
        currentStep--;
        renderStep();
      }
    } else if (action === 'Next') {
      const step = steps[currentStep];
      if (!step.validate || step.validate()) {
        currentStep++;
        renderStep();
      }
    } else if (action === 'Create Character' || action === 'Finish & Create Character') {
      console.log('🎯 Finish button clicked, validating...');
      const step = steps[currentStep];
      if (!step.validate || step.validate()) {
        console.log('✅ Validation passed, calling finishWizard()');
        finishWizard();
      } else {
        console.log('❌ Validation failed');
      }
    }
  }

  function renderWizardSpells(className, maxSpellLevel, cantripsNeeded, spellsNeeded) {
    if (!window.SPELLS_DATA) return;

    // Filter spells for this class
    const classSpells = window.SPELLS_DATA.filter(spell =>
      spell.classes && spell.classes.includes(className)
    );

    // Separate cantrips and leveled spells
    const cantrips = classSpells.filter(s => s.level === 0);
    const leveledSpells = classSpells.filter(s => s.level > 0 && s.level <= maxSpellLevel);

    // Render cantrips
    if (cantripsNeeded > 0) {
      renderSpellCategory('cantrip', cantrips, cantripsNeeded);
    }

    // Render leveled spells
    if (spellsNeeded > 0) {
      renderSpellCategory('spell', leveledSpells, spellsNeeded);
    }
  }

  function renderSpellCategory(type, spells, maxSelect) {
    const listId = type === 'cantrip' ? 'cantripList' : 'spellList';
    const searchId = type === 'cantrip' ? 'cantripSearch' : 'spellSearch';
    const selectedKey = type === 'cantrip' ? 'selectedCantrips' : 'selectedSpells';

    let filteredSpells = [...spells];
    let searchTerm = '';
    let levelFilter = 'all';

    function renderList() {
      const listEl = document.getElementById(listId);
      if (!listEl) return;

      let displaySpells = filteredSpells;

      // Apply search filter
      if (searchTerm) {
        displaySpells = displaySpells.filter(spell =>
          spell.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (spell.school || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply level filter (for leveled spells only)
      if (type === 'spell' && levelFilter !== 'all') {
        displaySpells = displaySpells.filter(s => s.level === parseInt(levelFilter));
      }

      // Limit to 50 results
      displaySpells = displaySpells.slice(0, 50);

      listEl.innerHTML = displaySpells.map(spell => {
        const isSelected = wizardData[selectedKey].some(s => s.title === spell.title);
        const tooltipContent = escapeHtml(getSpellTooltipContent(spell));
        return `
          <div class="form-check d-flex align-items-start">
            <input class="form-check-input spell-checkbox" type="checkbox"
                   id="${type}-${spell.title.replace(/[^a-zA-Z0-9]/g, '')}"
                   data-spell-title="${spell.title}"
                   ${isSelected ? 'checked' : ''}>
            <label class="form-check-label small flex-grow-1" for="${type}-${spell.title.replace(/[^a-zA-Z0-9]/g, '')}">
              <strong>${spell.title}</strong>
              ${type === 'spell' ? `<span class="badge bg-secondary ms-1">Lvl ${spell.level}</span>` : ''}
              <small class="text-muted ms-1">${spell.school || ''}</small>
            </label>
            <i class="bi bi-question-circle text-secondary ms-2 spell-info-icon"
               data-bs-toggle="tooltip"
               data-bs-placement="right"
               data-bs-html="true"
               title="${tooltipContent}"
               style="cursor: help; font-size: 0.85rem; opacity: 0.7;"></i>
          </div>
        `;
      }).join('');

      // Initialize tooltips for spell info icons
      listEl.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        new bootstrap.Tooltip(el, { trigger: 'hover focus', html: true });
      });

      // Add event listeners to checkboxes
      listEl.querySelectorAll('.spell-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const spellTitle = e.target.dataset.spellTitle;
          const spell = spells.find(s => s.title === spellTitle);
          if (!spell) return;

          if (e.target.checked) {
            // Add spell
            if (wizardData[selectedKey].length < maxSelect) {
              wizardData[selectedKey].push(spell);
            } else {
              alert(`You can only select ${maxSelect} ${type === 'cantrip' ? 'cantrips' : 'spells'}.`);
              e.target.checked = false;
              return;
            }
          } else {
            // Remove spell
            wizardData[selectedKey] = wizardData[selectedKey].filter(s => s.title !== spellTitle);
          }

          updateSelectedDisplay();
        });
      });
    }

    function updateSelectedDisplay() {
      const countEl = document.getElementById(type === 'cantrip' ? 'selectedCantripCount' : 'selectedSpellCount');
      const listEl = document.getElementById(type === 'cantrip' ? 'selectedCantripsList' : 'selectedSpellsList');

      if (countEl) {
        const count = wizardData[selectedKey].length;
        countEl.textContent = `${count}/${maxSelect}`;
        countEl.className = count === maxSelect ? 'badge bg-success' : 'badge bg-primary';
      }

      if (listEl) {
        if (wizardData[selectedKey].length === 0) {
          listEl.innerHTML = '<small class="text-muted">None selected</small>';
        } else {
          listEl.innerHTML = wizardData[selectedKey].map(s =>
            `<span class="badge bg-info me-1">${s.title}</span>`
          ).join('');
        }
      }
    }

    // Set up search
    const searchEl = document.getElementById(searchId);
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderList();
      });
    }

    // Set up level filter (for leveled spells only)
    if (type === 'spell') {
      const filterEl = document.getElementById('spellLevelFilter');
      if (filterEl) {
        filterEl.addEventListener('change', (e) => {
          levelFilter = e.target.value;
          renderList();
        });
      }
    }

    // Initial render
    renderList();
    updateSelectedDisplay();
  }

  function renderASISelections(asiCount) {
    const container = document.getElementById('asiSelectionsContainer');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < asiCount; i++) {
      const selectionDiv = document.createElement('div');
      selectionDiv.className = 'card bg-dark border-secondary mb-3';
      selectionDiv.innerHTML = `
        <div class="card-header">
          <strong>Choice ${i + 1} of ${asiCount}</strong>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <div class="form-check">
              <input class="form-check-input" type="radio" name="asi${i}Type" id="asi${i}TypeASI" value="asi">
              <label class="form-check-label" for="asi${i}TypeASI">
                <strong>Ability Score Improvement</strong> - Increase one ability by +2 or two abilities by +1 each
              </label>
            </div>
            <div class="form-check mt-2">
              <input class="form-check-input" type="radio" name="asi${i}Type" id="asi${i}TypeFeat" value="feat">
              <label class="form-check-label" for="asi${i}TypeFeat">
                <strong>Feat</strong> - Gain a special feat ability
              </label>
            </div>
          </div>

          <div id="asi${i}ASIOptions" class="d-none">
            <p class="small text-muted">Choose how to distribute your +2 bonus:</p>
            <div class="row g-2">
              ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(ability => `
                <div class="col-md-4">
                  <label class="form-label small">${ability.toUpperCase()}</label>
                  <select class="form-select form-select-sm asi-select" data-asi-index="${i}" data-ability="${ability}">
                    <option value="0">+0</option>
                    <option value="1">+1</option>
                    <option value="2">+2</option>
                  </select>
                </div>
              `).join('')}
            </div>
            <div class="mt-2"><small class="text-warning" id="asi${i}Total">Total: +0 (must equal +2)</small></div>
          </div>

          <div id="asi${i}FeatOptions" class="d-none">
            <label for="asi${i}FeatSelect" class="form-label">Choose a Feat:</label>
            <select class="form-select" id="asi${i}FeatSelect">
              <option value="">Select a feat...</option>
            </select>
            <div id="asi${i}FeatDescription" class="alert alert-info mt-2 small" style="display:none;"></div>
          </div>
        </div>
      `;

      container.appendChild(selectionDiv);

      // Set up event listeners for this choice
      setupASIChoiceListeners(i);
    }

    // Populate feat dropdowns
    if (window.LevelUpData) {
      const allFeats = window.LevelUpData.getAllFeats();
      for (let i = 0; i < asiCount; i++) {
        const featSelect = document.getElementById(`asi${i}FeatSelect`);
        if (featSelect) {
          allFeats.forEach(featName => {
            const option = document.createElement('option');
            option.value = featName;
            option.textContent = featName;
            featSelect.appendChild(option);
          });
        }
      }
    }
  }

  function setupASIChoiceListeners(index) {
    const asiRadio = document.getElementById(`asi${index}TypeASI`);
    const featRadio = document.getElementById(`asi${index}TypeFeat`);
    const asiOptions = document.getElementById(`asi${index}ASIOptions`);
    const featOptions = document.getElementById(`asi${index}FeatOptions`);

    // Radio button listeners
    if (asiRadio) {
      asiRadio.addEventListener('change', () => {
        if (asiRadio.checked) {
          asiOptions.classList.remove('d-none');
          featOptions.classList.add('d-none');
          updateASIChoice(index, 'asi');
        }
      });
    }

    if (featRadio) {
      featRadio.addEventListener('change', () => {
        if (featRadio.checked) {
          asiOptions.classList.add('d-none');
          featOptions.classList.remove('d-none');
          updateASIChoice(index, 'feat');
        }
      });
    }

    // ASI select listeners
    const asiSelects = document.querySelectorAll(`.asi-select[data-asi-index="${index}"]`);
    asiSelects.forEach(select => {
      select.addEventListener('change', () => {
        updateASITotal(index);
        saveASISelection(index);
      });
    });

    // Feat select listener
    const featSelect = document.getElementById(`asi${index}FeatSelect`);
    if (featSelect) {
      featSelect.addEventListener('change', (e) => {
        const featName = e.target.value;
        const descDiv = document.getElementById(`asi${index}FeatDescription`);

        if (featName && window.LevelUpData) {
          const featData = window.LevelUpData.getFeatData(featName);
          if (featData && descDiv) {
            descDiv.textContent = featData.description;
            descDiv.style.display = 'block';
          }
        } else if (descDiv) {
          descDiv.style.display = 'none';
        }

        saveFeatSelection(index, featName);
      });
    }
  }

  function updateASIChoice(index, type) {
    if (!wizardData.asiChoices) {
      wizardData.asiChoices = [];
    }

    while (wizardData.asiChoices.length <= index) {
      wizardData.asiChoices.push({ type: null });
    }

    wizardData.asiChoices[index].type = type;
  }

  function updateASITotal(index) {
    const selects = document.querySelectorAll(`.asi-select[data-asi-index="${index}"]`);
    let total = 0;

    selects.forEach(select => {
      total += parseInt(select.value) || 0;
    });

    const totalSpan = document.getElementById(`asi${index}Total`);
    if (totalSpan) {
      totalSpan.textContent = `Total: +${total} (must equal +2)`;
      totalSpan.className = total === 2 ? 'text-success' : 'text-warning';
    }
  }

  function saveASISelection(index) {
    if (!wizardData.asiChoices) {
      wizardData.asiChoices = [];
    }

    while (wizardData.asiChoices.length <= index) {
      wizardData.asiChoices.push({ type: null });
    }

    const selects = document.querySelectorAll(`.asi-select[data-asi-index="${index}"]`);
    const increases = [];

    selects.forEach(select => {
      const ability = select.getAttribute('data-ability');
      const amount = parseInt(select.value) || 0;
      if (amount > 0) {
        increases.push({ ability, amount });
      }
    });

    wizardData.asiChoices[index] = {
      type: 'asi',
      increases
    };
  }

  function saveFeatSelection(index, featName) {
    if (!wizardData.asiChoices) {
      wizardData.asiChoices = [];
    }

    while (wizardData.asiChoices.length <= index) {
      wizardData.asiChoices.push({ type: null });
    }

    wizardData.asiChoices[index] = {
      type: 'feat',
      featName
    };
  }

  function gatherSubclassSpellData(spellNames) {
    // Convert spell names to spell objects from SPELLS_DATA
    if (!window.SPELLS_DATA || !Array.isArray(spellNames)) return [];

    const spellObjects = [];

    for (const spellName of spellNames) {
      // Find the spell in SPELLS_DATA
      const spell = window.SPELLS_DATA.find(s => s.title === spellName);
      if (spell) {
        spellObjects.push(spell);
      } else {
        console.warn(`Subclass spell not found in SPELLS_DATA: ${spellName}`);
      }
    }

    return spellObjects;
  }

  /**
   * Convert racial spell data to full spell objects
   * @param {Array} racialSpellEntries - Array of { spell, type, note?, level } objects from getRacialSpells
   * @returns {Array} - Array of spell objects with racial metadata
   */
  function gatherRacialSpellData(racialSpellEntries) {
    if (!window.SPELLS_DATA || !Array.isArray(racialSpellEntries)) return [];

    const spellObjects = [];

    for (const entry of racialSpellEntries) {
      // Find the spell in SPELLS_DATA
      const spell = window.SPELLS_DATA.find(s => s.title === entry.spell);
      if (spell) {
        // Add the spell with racial metadata
        spellObjects.push({
          ...spell,
          racialSpell: true,
          racialType: entry.type, // 'cantrip', 'once_per_long_rest', 'at_will', 'once_per_short_rest'
          racialNote: entry.note || null, // Additional notes like "2nd-level"
          gainedAtLevel: entry.level // Level this spell was gained
        });
      } else {
        console.warn(`Racial spell not found in SPELLS_DATA: ${entry.spell}`);
      }
    }

    return spellObjects;
  }

  function gatherClassFeatures(className, subclassName, level) {
    // Get class data from LevelUpData if available
    if (!window.LevelUpData || !window.LevelUpData.CLASS_DATA) {
      console.warn('LevelUpData not available, cannot gather class features');
      return '';
    }

    const classData = window.LevelUpData.CLASS_DATA[className];
    if (!classData || !classData.features) {
      console.warn(`No feature data found for class: ${className}`);
      return '';
    }

    const features = [];

    // Gather features from level 1 to current level
    for (let lvl = 1; lvl <= level; lvl++) {
      const levelFeatures = classData.features[lvl];
      if (levelFeatures && levelFeatures.length > 0) {
        features.push(`**Level ${lvl}:**`);
        levelFeatures.forEach(feature => {
          features.push(`- ${feature}`);
        });
      }
    }

    // Add subclass features if available
    if (subclassName && window.LevelUpData.SUBCLASS_DATA) {
      const subclassData = window.LevelUpData.SUBCLASS_DATA[className];
      if (subclassData && subclassData.options) {
        const subclass = subclassData.options[subclassName];
        if (subclass && subclass.features) {
          const subclassFeatures = [];
          for (let lvl = 1; lvl <= level; lvl++) {
            const levelFeatures = subclass.features[lvl];
            if (levelFeatures && levelFeatures.length > 0) {
              subclassFeatures.push(`**${subclassName} - Level ${lvl}:**`);
              levelFeatures.forEach(feature => {
                subclassFeatures.push(`- ${feature}`);
              });
            }
          }
          if (subclassFeatures.length > 0) {
            features.push('');
            features.push(`**${subclassName} Features:**`);
            features.push(...subclassFeatures);
          }
        }
      }
    }

    return features.join('\n');
  }

  /**
   * Gather racial features for the character
   * @param {string} race - Character's race
   * @param {string} subrace - Character's subrace (optional)
   * @param {number} level - Character's level
   * @returns {string} - Formatted racial features text
   */
  function gatherRacialFeatures(race, subrace, level) {
    // Use LevelUpData's comprehensive formatter if available
    if (window.LevelUpData && typeof window.LevelUpData.formatRacialFeaturesAsText === 'function') {
      return window.LevelUpData.formatRacialFeaturesAsText(race, subrace, level);
    }

    // Fallback to basic formatting if LevelUpData not available
    console.warn('LevelUpData.formatRacialFeaturesAsText not available, using basic formatting');
    const lines = [];
    const raceName = subrace ? `${subrace} (${race})` : race;
    lines.push(`**${raceName} Racial Features:**`);
    lines.push('- See Player\'s Handbook for full racial feature details.');
    return lines.join('\n');
  }

  /**
   * Gather background feature for the character
   * @param {string} background - Character's background
   * @returns {string} - Formatted background feature text
   */
  function gatherBackgroundFeature(background) {
    // Use LevelUpData's formatter if available
    if (window.LevelUpData && typeof window.LevelUpData.formatBackgroundFeatureAsText === 'function') {
      return window.LevelUpData.formatBackgroundFeatureAsText(background);
    }

    // Fallback to basic formatting if LevelUpData not available
    console.warn('LevelUpData.formatBackgroundFeatureAsText not available, using basic formatting');
    if (!background) return '';
    return `**${background} Background Feature:**\n- See Player's Handbook for full background feature details.`;
  }

  /**
   * Gather starting equipment for the character (class + background)
   * @param {string} className - Character's class
   * @param {string} background - Character's background
   * @returns {Array} - Array of inventory items
   */
  function gatherStartingEquipment(className, background) {
    // Use LevelUpData's helper if available
    if (window.LevelUpData && typeof window.LevelUpData.getAllStartingEquipment === 'function') {
      return window.LevelUpData.getAllStartingEquipment(className, background);
    }

    // Fallback - return empty array
    console.warn('LevelUpData.getAllStartingEquipment not available');
    return [];
  }

  /**
   * Gather Wild Shape beast form reference for Druid characters
   * @param {number} level - Character's level
   * @param {string} subclass - Character's subclass (to check for Circle of the Moon)
   * @returns {string} - Formatted Wild Shape reference text, or empty string if not a druid
   */
  function gatherWildShapeReference(level, subclass) {
    // Use LevelUpData's helper if available
    if (window.LevelUpData && typeof window.LevelUpData.formatWildShapeReference === 'function') {
      return window.LevelUpData.formatWildShapeReference(level, subclass || '');
    }

    // Fallback - basic text
    return '**Wild Shape:** See Player\'s Handbook for available beast forms.';
  }

  function finishWizard() {
    console.log('🧙 Wizard finishing with data:', wizardData);

    // Add racial ability score bonuses
    applyRacialBonuses();

    // Get background skills
    const backgroundSkills = getBackgroundSkills(wizardData.background);
    wizardData.backgroundSkills = backgroundSkills;

    // Combine all skills
    wizardData.allSkills = [...(wizardData.classSkills || []), ...backgroundSkills];

    // Calculate saving throws
    wizardData.savingThrows = getClassSavingThrows(wizardData.class);

    // Gather racial features
    wizardData.racialFeatures = gatherRacialFeatures(wizardData.race, wizardData.subrace, wizardData.level);
    console.log(`🧬 Gathered racial features for ${wizardData.race}${wizardData.subrace ? ` (${wizardData.subrace})` : ''}`);

    // Gather background feature
    wizardData.backgroundFeature = gatherBackgroundFeature(wizardData.background);
    if (wizardData.backgroundFeature) {
      console.log(`📜 Gathered background feature for ${wizardData.background}`);
    }

    // Gather class features for levels 1-N
    wizardData.classFeatures = gatherClassFeatures(wizardData.class, wizardData.subclass, wizardData.level);

    // Gather Wild Shape reference for Druids (level 2+)
    if (wizardData.class === 'Druid' && wizardData.level >= 2) {
      wizardData.wildShapeReference = gatherWildShapeReference(wizardData.level, wizardData.subclass);
      console.log(`🐻 Gathered Wild Shape reference for level ${wizardData.level} Druid`);
    }

    // Combine racial, background, and class features
    const featureSections = [wizardData.racialFeatures];
    if (wizardData.backgroundFeature) {
      featureSections.push('');
      featureSections.push(wizardData.backgroundFeature);
    }
    featureSections.push('');
    featureSections.push(wizardData.classFeatures);
    // Add Wild Shape reference for Druids
    if (wizardData.wildShapeReference) {
      featureSections.push('');
      featureSections.push(wizardData.wildShapeReference);
    }
    wizardData.allFeatures = featureSections.join('\n');

    // Gather starting equipment (class + background)
    wizardData.startingEquipment = gatherStartingEquipment(wizardData.class, wizardData.background);
    if (wizardData.startingEquipment && wizardData.startingEquipment.length > 0) {
      console.log(`🎒 Gathered ${wizardData.startingEquipment.length} starting equipment items`);
    }

    // Gather subclass spells (if applicable)
    if (wizardData.subclass && window.LevelUpData && window.LevelUpData.getSubclassSpells) {
      const subclassSpellNames = window.LevelUpData.getSubclassSpells(wizardData.class, wizardData.subclass, wizardData.level);
      if (subclassSpellNames && subclassSpellNames.length > 0) {
        wizardData.subclassSpells = gatherSubclassSpellData(subclassSpellNames);
        console.log(`✨ Added ${wizardData.subclassSpells.length} subclass spells for ${wizardData.subclass}`);
      }
    }

    // Gather racial spells (if applicable)
    if (window.LevelUpData && typeof window.LevelUpData.getRacialSpells === 'function') {
      // Parse race and subrace from the stored format
      let race = wizardData.race;
      let subrace = wizardData.subrace;

      // Handle format like "Tiefling (Asmodeus)" if subrace wasn't separately stored
      if (race && race.includes('(') && !subrace) {
        const match = race.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
          race = match[1].trim();
          subrace = match[2].trim();
        }
      }

      const racialSpellData = window.LevelUpData.getRacialSpells(race, subrace, wizardData.level);
      if (racialSpellData && racialSpellData.length > 0) {
        wizardData.racialSpells = gatherRacialSpellData(racialSpellData);
        console.log(`🧬 Added ${wizardData.racialSpells.length} racial spells for ${race}${subrace ? ` (${subrace})` : ''}`);
      }
    }

    console.log('📋 Final wizard data:', {
      name: wizardData.name,
      race: wizardData.race,
      class: wizardData.class,
      level: wizardData.level,
      hp: wizardData.maxHP,
      ac: wizardData.ac
    });

    // Populate the main character form with wizard data
    console.log('🔍 Checking fillFormFromWizardData...', typeof window.fillFormFromWizardData);
    if (typeof window.fillFormFromWizardData === 'function') {
      console.log('✅ Calling fillFormFromWizardData');
      window.fillFormFromWizardData(wizardData);

      // Wait for the form to be filled and saved (fillFormFromWizardData has a 100ms delay)
      setTimeout(() => {
        // Close the modal
        const modal = document.getElementById('characterCreationModal');
        if (modal) {
          const bsModal = bootstrap.Modal.getInstance(modal);
          if (bsModal) bsModal.hide();
        }

        // Show success message
        alert(`Character created successfully!\n\n${wizardData.name}, the Level ${wizardData.level} ${wizardData.race} ${wizardData.class}\n\nYour character sheet has been populated with:\n✓ Ability scores (with racial bonuses)\n✓ HP: ${wizardData.maxHP}, AC: ${wizardData.ac}\n✓ Skills, saving throws, and proficiency bonus\n✓ Speed and basic stats\n\nYou can now add equipment, spells, and customize further!`);
      }, 200); // Wait 200ms to ensure fillFormFromWizardData completes
    } else {
      console.error('fillFormFromWizardData function not found. Make sure character.js is loaded.');
      alert('Error: Unable to populate character sheet. Please refresh the page and try again.');
    }
  }

  function applyRacialBonuses() {
    // Apply racial ability score increases
    const racialBonuses = {
      'Human': { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
      'Elf': { dex: 2 },
      'Dwarf': { con: 2 },
      'Halfling': { dex: 2 },
      'Dragonborn': { str: 2, cha: 1 },
      'Gnome': { int: 2 },
      'Half-Elf': { cha: 2 },
      'Half-Orc': { str: 2, con: 1 },
      'Tiefling': { cha: 2, int: 1 },
      'Aarakocra': { dex: 2, wis: 1 },
      'Aasimar': { cha: 2 },
      'Bugbear': { str: 2, dex: 1 },
      'Centaur': { str: 2, wis: 1 },
      'Changeling': { cha: 2 },
      'Firbolg': { wis: 2, str: 1 },
      'Genasi (Air)': { con: 2, dex: 1 },
      'Genasi (Earth)': { con: 2, str: 1 },
      'Genasi (Fire)': { con: 2, int: 1 },
      'Genasi (Water)': { con: 2, wis: 1 },
      'Goblin': { dex: 2, con: 1 },
      'Goliath': { str: 2, con: 1 },
      'Grung': { dex: 2, con: 1 },
      'Hobgoblin': { con: 2, int: 1 },
      'Kalashtar': { wis: 2, cha: 1 },
      'Kenku': { dex: 2, wis: 1 },
      'Kobold': { dex: 2, str: -2 },
      'Leonin': { con: 2, str: 1 },
      'Lizardfolk': { con: 2, wis: 1 },
      'Locathah': { dex: 2, wis: 1 },
      'Loxodon': { con: 2, wis: 1 },
      'Minotaur': { str: 2, con: 1 },
      'Orc': { str: 2, con: 1 },
      'Satyr': { cha: 2, dex: 1 },
      'Shifter': { dex: 2 },
      'Simic Hybrid': { con: 2 },
      'Tabaxi': { dex: 2, cha: 1 },
      'Tortle': { str: 2, wis: 1 },
      'Triton': { str: 1, con: 1, cha: 1 },
      'Vedalken': { int: 2, wis: 1 },
      'Warforged': { con: 2 },
      'Yuan-ti Pureblood': { cha: 2, int: 1 }
    };

    // Apply subrace bonuses
    const subraceBonuses = {
      'High Elf': { int: 1 },
      'Wood Elf': { wis: 1 },
      'Dark Elf (Drow)': { cha: 1 },
      'Hill Dwarf': { wis: 1 },
      'Mountain Dwarf': { str: 2 },
      'Lightfoot': { cha: 1 },
      'Stout': { con: 1 },
      'Ghostwise': { wis: 1 },
      'Forest Gnome': { dex: 1 },
      'Rock Gnome': { con: 1 },
      'Deep Gnome (Svirfneblin)': { dex: 1 },
      'Protector': { wis: 1 },
      'Scourge': { con: 1 },
      'Fallen': { str: 1 },
      'Beasthide': { con: 1 },
      'Longtooth': { str: 1 },
      'Swiftstride': { dex: 1 },
      'Wildhunt': { wis: 1 }
    };

    const baseBonuses = racialBonuses[wizardData.race] || {};
    const subraceBonus = subraceBonuses[wizardData.subrace] || {};

    // Store original scores
    wizardData.baseStr = wizardData.str;
    wizardData.baseDex = wizardData.dex;
    wizardData.baseCon = wizardData.con;
    wizardData.baseInt = wizardData.int;
    wizardData.baseWis = wizardData.wis;
    wizardData.baseCha = wizardData.cha;

    // Apply racial bonuses
    wizardData.str += (baseBonuses.str || 0) + (subraceBonus.str || 0);
    wizardData.dex += (baseBonuses.dex || 0) + (subraceBonus.dex || 0);
    wizardData.con += (baseBonuses.con || 0) + (subraceBonus.con || 0);
    wizardData.int += (baseBonuses.int || 0) + (subraceBonus.int || 0);
    wizardData.wis += (baseBonuses.wis || 0) + (subraceBonus.wis || 0);
    wizardData.cha += (baseBonuses.cha || 0) + (subraceBonus.cha || 0);

    // Apply ASI bonuses from character creation
    if (wizardData.asiChoices && wizardData.asiChoices.length > 0) {
      wizardData.asiChoices.forEach((choice, index) => {
        if (choice.type === 'asi' && choice.increases) {
          choice.increases.forEach(inc => {
            const ability = inc.ability;
            const amount = inc.amount;

            if (ability === 'str') wizardData.str = Math.min(20, wizardData.str + amount);
            else if (ability === 'dex') wizardData.dex = Math.min(20, wizardData.dex + amount);
            else if (ability === 'con') wizardData.con = Math.min(20, wizardData.con + amount);
            else if (ability === 'int') wizardData.int = Math.min(20, wizardData.int + amount);
            else if (ability === 'wis') wizardData.wis = Math.min(20, wizardData.wis + amount);
            else if (ability === 'cha') wizardData.cha = Math.min(20, wizardData.cha + amount);
          });
        }
        // Note: Feats that grant ability increases or other benefits are stored in asiChoices
        // but their mechanical benefits would need to be applied through the character sheet
      });
    }

    // Recalculate HP with new CON
    const conMod = Math.floor((wizardData.con - 10) / 2);
    const hitDice = {
      'Artificer': 8, 'Barbarian': 12, 'Bard': 8, 'Cleric': 8, 'Druid': 8,
      'Fighter': 10, 'Monk': 8, 'Paladin': 10, 'Ranger': 10, 'Rogue': 8,
      'Sorcerer': 6, 'Warlock': 8, 'Wizard': 6
    };
    const hitDie = hitDice[wizardData.class] || 8;
    wizardData.maxHP = hitDie + conMod;
    wizardData.currentHP = wizardData.maxHP;
  }

  function getBackgroundSkills(background) {
    const backgroundSkills = {
      'Acolyte': ['Insight', 'Religion'],
      'Charlatan': ['Deception', 'Sleight of Hand'],
      'Criminal': ['Deception', 'Stealth'],
      'Entertainer': ['Acrobatics', 'Performance'],
      'Folk Hero': ['Animal Handling', 'Survival'],
      'Guild Artisan': ['Insight', 'Persuasion'],
      'Hermit': ['Medicine', 'Religion'],
      'Noble': ['History', 'Persuasion'],
      'Outlander': ['Athletics', 'Survival'],
      'Sage': ['Arcana', 'History'],
      'Sailor': ['Athletics', 'Perception'],
      'Soldier': ['Athletics', 'Intimidation'],
      'Urchin': ['Sleight of Hand', 'Stealth']
    };
    return backgroundSkills[background] || [];
  }

  function getClassSavingThrows(charClass) {
    const classSaves = {
      'Artificer': ['Constitution', 'Intelligence'],
      'Barbarian': ['Strength', 'Constitution'],
      'Bard': ['Dexterity', 'Charisma'],
      'Cleric': ['Wisdom', 'Charisma'],
      'Druid': ['Intelligence', 'Wisdom'],
      'Fighter': ['Strength', 'Constitution'],
      'Monk': ['Strength', 'Dexterity'],
      'Paladin': ['Wisdom', 'Charisma'],
      'Ranger': ['Strength', 'Dexterity'],
      'Rogue': ['Dexterity', 'Intelligence'],
      'Sorcerer': ['Constitution', 'Charisma'],
      'Warlock': ['Wisdom', 'Charisma'],
      'Wizard': ['Intelligence', 'Wisdom']
    };
    return classSaves[charClass] || ['Strength', 'Dexterity'];
  }

  // Public API
  return {
    open: openWizard
  };
})();
