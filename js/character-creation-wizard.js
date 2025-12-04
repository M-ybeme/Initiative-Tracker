/**
 * Character Creation Wizard
 * A step-by-step guide for new D&D 5e players creating their first character
 */

const CharacterCreationWizard = (function() {
  'use strict';

  let currentStep = 0;
  let wizardData = {};

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
            <optgroup label="Common Races">
              <option value="Human">Human - Versatile, +1 to all abilities</option>
              <option value="Elf">Elf - Graceful, +2 Dex, darkvision, keen senses</option>
              <option value="Dwarf">Dwarf - Sturdy, +2 Con, darkvision, resilient</option>
              <option value="Halfling">Halfling - Lucky, +2 Dex, brave, nimble</option>
            </optgroup>
            <optgroup label="Uncommon Races">
              <option value="Dragonborn">Dragonborn - Draconic, +2 Str +1 Cha, breath weapon</option>
              <option value="Gnome">Gnome - Clever, +2 Int, darkvision, cunning</option>
              <option value="Half-Elf">Half-Elf - Charismatic, +2 Cha +1 to two others, versatile</option>
              <option value="Half-Orc">Half-Orc - Strong, +2 Str +1 Con, relentless, savage</option>
              <option value="Tiefling">Tiefling - Infernal, +2 Cha +1 Int, darkvision, fire resistance</option>
            </optgroup>
          </select>
        </div>
        <div id="raceDescription" class="alert alert-info" style="display:none;"></div>
      `,
      buttons: ['Back', 'Next'],
      validate: () => {
        const race = document.getElementById('wizardRace')?.value;
        if (!race) {
          alert('Please choose a race.');
          return false;
        }
        wizardData.race = race;
        return true;
      },
      onShow: () => {
        const raceSelect = document.getElementById('wizardRace');
        const raceDesc = document.getElementById('raceDescription');
        if (raceSelect && raceDesc) {
          raceSelect.addEventListener('change', (e) => {
            const descriptions = {
              'Human': 'Humans are the most adaptable and ambitious people. They get +1 to all ability scores.',
              'Elf': 'Elves are magical people of otherworldly grace. They have keen senses and a deep connection to nature.',
              'Dwarf': 'Dwarves are stout and hardy, known for mining and craftsmanship. They are tough and resilient.',
              'Halfling': 'Halflings are small, cheerful folk who value comfort. They are naturally lucky and brave.',
              'Dragonborn': 'Dragonborn look like humanoid dragons. They have a breath weapon matching their draconic ancestry.',
              'Gnome': 'Gnomes are small, intelligent, and inventive. They love tinkering and have a knack for illusion magic.',
              'Half-Elf': 'Half-elves combine human ambition with elven grace. They are versatile and charismatic.',
              'Half-Orc': 'Half-orcs are strong and intimidating, with a fierce determination that helps them endure.',
              'Tiefling': 'Tieflings have infernal heritage, giving them a devilish appearance and innate magical abilities.'
            };
            if (e.target.value && descriptions[e.target.value]) {
              raceDesc.textContent = descriptions[e.target.value];
              raceDesc.style.display = 'block';
            } else {
              raceDesc.style.display = 'none';
            }
          });
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
            <optgroup label="Martial Classes (Fighters)">
              <option value="Fighter">Fighter - Master of weapons and armor</option>
              <option value="Barbarian">Barbarian - Fierce warrior who rages in battle</option>
              <option value="Rogue">Rogue - Stealthy, skillful, sneaky</option>
              <option value="Ranger">Ranger - Wilderness warrior and tracker</option>
              <option value="Monk">Monk - Unarmed martial artist with ki powers</option>
            </optgroup>
            <optgroup label="Spellcasters">
              <option value="Wizard">Wizard - Arcane scholar with vast spell knowledge</option>
              <option value="Cleric">Cleric - Divine healer and support caster</option>
              <option value="Druid">Druid - Nature spellcaster who can wild shape</option>
              <option value="Sorcerer">Sorcerer - Innate magic user with metamagic</option>
              <option value="Warlock">Warlock - Magic from a powerful patron</option>
              <option value="Bard">Bard - Charismatic performer with support magic</option>
            </optgroup>
            <optgroup label="Hybrid Classes">
              <option value="Paladin">Paladin - Holy warrior with divine magic</option>
            </optgroup>
          </select>
        </div>
        <div id="classDescription" class="alert alert-info" style="display:none;"></div>
        <div id="classHitDie" class="alert alert-warning" style="display:none;"></div>
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

        if (classSelect && classDesc && hitDieInfo) {
          classSelect.addEventListener('change', (e) => {
            const descriptions = {
              'Fighter': 'Fighters are masters of martial combat. They excel with weapons and armor. Great for beginners!',
              'Barbarian': 'Barbarians channel their rage into devastating attacks. They have high HP and can take lots of damage.',
              'Rogue': 'Rogues are cunning and precise. They deal massive damage with sneak attacks and have many skills.',
              'Ranger': 'Rangers are skilled hunters and trackers who blend combat with nature magic.',
              'Monk': 'Monks are martial artists who use ki energy for supernatural abilities.',
              'Wizard': 'Wizards study arcane magic and have the largest spell selection. They are fragile but powerful.',
              'Cleric': 'Clerics serve a deity and can heal allies and smite foes. Very versatile!',
              'Druid': 'Druids draw power from nature and can transform into animals.',
              'Sorcerer': 'Sorcerers have innate magic and can modify their spells with metamagic.',
              'Warlock': 'Warlocks made a pact for power. They regain spell slots on short rests.',
              'Bard': 'Bards inspire allies with music and have a mix of magic and skills.',
              'Paladin': 'Paladins are holy warriors who smite evil and protect the innocent.'
            };

            const hitDice = {
              'Fighter': 'd10', 'Barbarian': 'd12', 'Rogue': 'd8', 'Ranger': 'd10', 'Monk': 'd8',
              'Wizard': 'd6', 'Cleric': 'd8', 'Druid': 'd8', 'Sorcerer': 'd6', 'Warlock': 'd8',
              'Bard': 'd8', 'Paladin': 'd10'
            };

            if (e.target.value && descriptions[e.target.value]) {
              classDesc.textContent = descriptions[e.target.value];
              classDesc.style.display = 'block';

              hitDieInfo.innerHTML = `<strong>Hit Die:</strong> ${hitDice[e.target.value]} per level. This determines your Hit Points.`;
              hitDieInfo.style.display = 'block';
            } else {
              classDesc.style.display = 'none';
              hitDieInfo.style.display = 'none';
            }
          });
        }
      }
    },
    {
      title: "Step 4: Ability Scores",
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
        <div class="alert alert-info mt-3">
          <strong>Tip:</strong> Put your highest scores in the abilities your class uses most!
          <ul class="small mb-0 mt-2">
            <li><strong>Fighter/Barbarian/Paladin:</strong> Strength or Dexterity, then Constitution</li>
            <li><strong>Rogue/Ranger/Monk:</strong> Dexterity, then Wisdom or Strength</li>
            <li><strong>Wizard:</strong> Intelligence, then Dexterity or Constitution</li>
            <li><strong>Cleric/Druid:</strong> Wisdom, then Constitution or Strength</li>
            <li><strong>Sorcerer/Bard/Warlock:</strong> Charisma, then Constitution or Dexterity</li>
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
          rollBtn.addEventListener('click', () => {
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
          });
        }
      }
    },
    {
      title: "Step 5: Skills & Proficiencies",
      content: `
        <h5>Choose your skills</h5>
        <p>Skills represent areas where your character has training. Your class determines how many you can choose.</p>
        <div class="alert alert-warning">
          <strong>Number of skills:</strong> This depends on your class. Most classes get 2-4 skill proficiencies.
          You'll be able to select these on the main character sheet after the wizard.
        </div>
        <p>Common skill choices by class:</p>
        <ul class="small">
          <li><strong>Fighter:</strong> Athletics, Intimidation, Perception</li>
          <li><strong>Rogue:</strong> Stealth, Sleight of Hand, Perception, Investigation</li>
          <li><strong>Wizard:</strong> Arcana, Investigation, History</li>
          <li><strong>Cleric:</strong> Insight, Medicine, Religion</li>
          <li><strong>Ranger:</strong> Survival, Nature, Stealth, Perception</li>
        </ul>
        <p class="text-muted small">We'll set this up on the main sheet in the next step.</p>
      `,
      buttons: ['Back', 'Next']
    },
    {
      title: "Step 6: Equipment & Details",
      content: `
        <h5>Final details</h5>
        <p>Let's set up some final character details.</p>
        <div class="mb-3">
          <label for="wizardAlignment" class="form-label">Alignment (optional)</label>
          <select class="form-select" id="wizardAlignment">
            <option value="">Choose alignment...</option>
            <option value="Lawful Good">Lawful Good - Honors rules, helps others</option>
            <option value="Neutral Good">Neutral Good - Helps others, flexible about rules</option>
            <option value="Chaotic Good">Chaotic Good - Freedom-loving, kind-hearted</option>
            <option value="Lawful Neutral">Lawful Neutral - Follows a code, not swayed by good/evil</option>
            <option value="True Neutral">True Neutral - Balanced, avoids extremes</option>
            <option value="Chaotic Neutral">Chaotic Neutral - Free spirit, unpredictable</option>
            <option value="Lawful Evil">Lawful Evil - Uses rules for selfish gain</option>
            <option value="Neutral Evil">Neutral Evil - Selfish, no honor</option>
            <option value="Chaotic Evil">Chaotic Evil - Destructive and cruel</option>
          </select>
        </div>
        <div class="alert alert-info">
          <strong>Equipment:</strong> Your class determines your starting equipment. Check your class description in the Player's Handbook for details, or ask your DM for starting gold to buy equipment.
        </div>
        <div class="alert alert-success">
          <strong>Almost done!</strong> When you finish this wizard, we'll populate the character sheet with everything you've chosen. You can then:
          <ul class="mb-0">
            <li>Fill in remaining details (AC, HP, equipment)</li>
            <li>Select your skill proficiencies</li>
            <li>Add spells (if you're a spellcaster)</li>
            <li>Choose your background features</li>
          </ul>
        </div>
      `,
      buttons: ['Back', 'Finish & Create Character'],
      validate: () => {
        wizardData.alignment = document.getElementById('wizardAlignment')?.value || '';
        return true;
      }
    }
  ];

  function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  function openWizard() {
    currentStep = 0;
    wizardData = {};

    const modal = document.getElementById('characterCreationModal');
    if (modal) {
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
      renderStep();
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
    } else if (action === 'Finish & Create Character') {
      const step = steps[currentStep];
      if (!step.validate || step.validate()) {
        finishWizard();
      }
    }
  }

  function finishWizard() {
    // Populate the main character form with wizard data
    if (typeof fillFormFromWizardData === 'function') {
      fillFormFromWizardData(wizardData);
    }

    // Close the modal
    const modal = document.getElementById('characterCreationModal');
    if (modal) {
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
    }

    // Show success message
    alert(`Character created! Welcome ${wizardData.name}, the ${wizardData.race} ${wizardData.class}!\n\nNow fill in the remaining details like HP, AC, skills, and equipment.`);
  }

  // Public API
  return {
    open: openWizard
  };
})();
