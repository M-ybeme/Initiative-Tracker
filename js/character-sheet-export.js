/**
 * Character Sheet Export Module
 * Complete D&D 5e character sheet export to PDF, PNG, and Word formats
 * Includes character portrait with proper cropping/framing
 */

(() => {

const CHARACTER_EXPORT_LICENSE_PHRASE = 'Creative Commons Attribution 4.0 International License';
const SRD_PDF_URL = 'https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf';
const CHARACTER_EXPORT_LICENSE_DEFAULTS = {
  attributionText: 'This work includes material from the System Reference Document 5.1 by Wizards of the Coast LLC and is licensed for our use under the Creative Commons Attribution 4.0 International License.',
  productIdentityDisclaimer: 'The DM\'s Toolbox references rules and mechanics from the Dungeons & Dragons 5e System Reference Document 5.1. Wizards of the Coast, Dungeons & Dragons, Forgotten Realms, Ravenloft, Eberron, the dragon ampersand, beholders, githyanki, githzerai, mind flayers, yuan-ti, and all other Wizards of the Coast product identity are trademarks of Wizards of the Coast LLC in the U.S.A. and other countries. The DM\'s Toolbox is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC.',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  srdUrl: SRD_PDF_URL
};

class CharacterSheetExporter {
  constructor() {
    this.printWindow = null;
  }

  /**
   * Export character sheet to PDF
   * @param {Object} character - Character data object
   */
  async exportToPDF(character) {
    if (!character) {
      alert('Please select a character first.');
      return;
    }

    try {
      // Load required libraries
      await this.loadLibrary('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await this.loadLibrary('html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');

      const sheetHTML = await this.generateSheetHTML(character);
      const container = this.createTempContainer(sheetHTML);

      // Wait for images and fonts to load
      await this.waitForImages(container);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Extra delay for images to render

      console.log('Starting html2canvas capture...');
      // Capture as canvas with high quality
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          console.log('html2canvas cloned document');
        }
      });
      console.log('html2canvas capture complete');

      // Create PDF with multiple pages
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate how to fit width to page
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      // If content fits on one page, just add it
      if (scaledHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight);
      } else {
        // Split across multiple pages
        let remainingHeight = scaledHeight;
        let sourceY = 0;
        let pageCount = 0;

        while (remainingHeight > 0) {
          if (pageCount > 0) {
            pdf.addPage();
          }

          const pageHeight = Math.min(pdfHeight, remainingHeight);
          const sourceHeight = (pageHeight / ratio);

          // Create a cropped section of the canvas
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const pageCtx = pageCanvas.getContext('2d');

          pageCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          const pageImgData = pageCanvas.toDataURL('image/png');

          pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pageHeight);

          sourceY += sourceHeight;
          remainingHeight -= pageHeight;
          pageCount++;
        }
      }

      pdf.save(`${this.sanitizeFilename(character.name || 'character')}-sheet.pdf`);

      document.body.removeChild(container);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF: ' + error.message);
    }
  }

  /**
   * Export character sheet as PNG image
   * @param {Object} character - Character data object
   */
  async exportToPNG(character) {
    if (!character) {
      alert('Please select a character first.');
      return;
    }

    try {
      await this.loadLibrary('html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');

      const sheetHTML = await this.generateSheetHTML(character);
      const container = this.createTempContainer(sheetHTML);

      await this.waitForImages(container);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
        imageTimeout: 15000
      });

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.sanitizeFilename(character.name || 'character')}-sheet.png`;
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(container);
      }, 'image/png');

    } catch (error) {
      console.error('PNG export error:', error);
      alert('Failed to export PNG: ' + error.message);
    }
  }

  /**
   * Export character sheet to Word document
   * @param {Object} character - Character data object
   */
  async exportToWord(character) {
    if (!character) {
      alert('Please select a character first.');
      return;
    }

    try {
      await this.loadLibrary('docx', 'https://unpkg.com/docx@7.8.2/build/index.js');

      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;

      const children = [];

      // Portrait export disabled for now
      // (can be added manually to Word doc if needed)

      // Character name as title
      children.push(
        new Paragraph({
          text: character.name || 'Unnamed Character',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      );

      // Subtitle
      children.push(
        new Paragraph({
          text: this.getCharacterSubtitle(character),
          alignment: AlignmentType.CENTER,
          italics: true,
        })
      );

      // Basic info
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      children.push(new Paragraph({ text: 'Basic Information', heading: HeadingLevel.HEADING_2 }));

      const basicInfo = [
        `Player: ${character.playerName || 'N/A'}`,
        `Race: ${character.race || 'N/A'}`,
        `Class: ${this.getClassDisplay(character)}`,
        `Background: ${character.background || 'N/A'}`,
        `Level: ${character.level || 'N/A'}`,
        `Alignment: ${character.alignment || 'N/A'}`,
        `Proficiency Bonus: ${this.getProficiencyBonus(character.level)}`,
      ];
      basicInfo.forEach(info => children.push(new Paragraph({ text: info })));

      // Combat stats
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      children.push(new Paragraph({ text: 'Combat Statistics', heading: HeadingLevel.HEADING_2 }));
      const combatStats = [
        `Armor Class: ${character.ac || 'N/A'}`,
        `Hit Points: ${character.currentHP || 0} / ${character.maxHP || 'N/A'}`,
        `Temporary HP: ${character.tempHP || 0}`,
        `Speed: ${character.speed || 'N/A'}`,
        `Initiative: ${character.initMod || '+0'}`,
        `Passive Perception: ${character.senses?.passivePerception || 'N/A'}`,
        `Passive Investigation: ${character.senses?.passiveInvestigation || 'N/A'}`,
        `Passive Insight: ${character.senses?.passiveInsight || 'N/A'}`,
        `Hit Dice: ${character.hitDiceRemaining || character.level || 0} / ${character.level || 0} ${character.hitDice || 'd8'}`,
        `Inspiration: ${character.inspiration ? 'Yes' : 'No'}`,
      ];
      combatStats.forEach(stat => children.push(new Paragraph({ text: stat })));

      // Death Saves & Exhaustion
      if (character.deathSaves || character.exhaustion) {
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        children.push(new Paragraph({ text: 'Death Saves & Exhaustion', heading: HeadingLevel.HEADING_2 }));
        if (character.deathSaves) {
          children.push(new Paragraph({ text: `Death Save Successes: ${character.deathSaves.successes || 0}/3` }));
          children.push(new Paragraph({ text: `Death Save Failures: ${character.deathSaves.failures || 0}/3` }));
          children.push(new Paragraph({ text: `Stable: ${character.deathSaves.stable ? 'Yes' : 'No'}` }));
        }
        children.push(new Paragraph({ text: `Exhaustion Level: ${character.exhaustion || 0}/6` }));
      }

      // Currency
      if (character.currency) {
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        children.push(new Paragraph({ text: 'Currency', heading: HeadingLevel.HEADING_2 }));
        children.push(new Paragraph({ text: `Copper: ${character.currency.cp || 0} | Silver: ${character.currency.sp || 0} | Electrum: ${character.currency.ep || 0} | Gold: ${character.currency.gp || 0} | Platinum: ${character.currency.pp || 0}` }));
      }

      // Ability scores
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      children.push(new Paragraph({ text: 'Ability Scores', heading: HeadingLevel.HEADING_2 }));
      if (character.stats) {
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const abilityNames = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
        abilities.forEach(ability => {
          const score = character.stats[ability] || 'N/A';
          const mod = character.statMods?.[ability] || this.calculateModifier(character.stats[ability]);
          children.push(new Paragraph({ text: `${abilityNames[ability]}: ${score} (${mod >= 0 ? '+' : ''}${mod})` }));
        });
      }

      // Saving Throws
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      children.push(new Paragraph({ text: 'Saving Throws', heading: HeadingLevel.HEADING_2 }));
      if (character.savingThrows) {
        const abilityNames = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
        Object.keys(abilityNames).forEach(key => {
          const save = character.savingThrows[key];
          const profStr = save?.prof ? '(Proficient)' : '';
          const bonus = save?.bonus || '';
          children.push(new Paragraph({ text: `${abilityNames[key]}: ${profStr} ${bonus}` }));
        });
      }

      // Skills
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      children.push(new Paragraph({ text: 'Skills', heading: HeadingLevel.HEADING_2 }));
      if (character.skills) {
        const skillNames = {
          acrobatics: 'Acrobatics', animalHandling: 'Animal Handling', arcana: 'Arcana',
          athletics: 'Athletics', deception: 'Deception', history: 'History',
          insight: 'Insight', intimidation: 'Intimidation', investigation: 'Investigation',
          medicine: 'Medicine', nature: 'Nature', perception: 'Perception',
          performance: 'Performance', persuasion: 'Persuasion', religion: 'Religion',
          sleightOfHand: 'Sleight of Hand', stealth: 'Stealth', survival: 'Survival'
        };

        Object.keys(skillNames).forEach(skillKey => {
          const skill = character.skills[skillKey];
          if (skill) {
            let profStr = skill.exp ? '(Expertise)' : skill.prof ? '(Proficient)' : '';
            let bonus = skill.bonus ? ` ${skill.bonus >= 0 ? '+' : ''}${skill.bonus}` : '';
            children.push(new Paragraph({ text: `${skillNames[skillKey]}: ${profStr}${bonus}` }));
          }
        });
      }

      // Custom Resources
      if (character.resources) {
        const hasResources = Object.values(character.resources).some(r => r.name);
        if (hasResources) {
          children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
          children.push(new Paragraph({ text: 'Resources', heading: HeadingLevel.HEADING_2 }));
          ['res1', 'res2', 'res3'].forEach(key => {
            const res = character.resources[key];
            if (res && res.name) {
              children.push(new Paragraph({ text: `${res.name}: ${res.current || 0} / ${res.max || 0}` }));
            }
          });
        }
      }

      // Attacks
      if (character.attacks && character.attacks.length > 0) {
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        children.push(new Paragraph({ text: 'Attacks & Actions', heading: HeadingLevel.HEADING_2 }));
        character.attacks.forEach(attack => {
          const details = [];
          details.push(`${attack.name || 'Unnamed Attack'}`);
          details.push(`Type: ${this.formatAttackType(attack.type || 'melee-weapon')}`);
          if (attack.range) details.push(`Range: ${attack.range}`);
          if (attack.bonus || attack.attackBonus) details.push(`To Hit: ${attack.bonus || attack.attackBonus}`);
          if (attack.saveDC) details.push(`Save DC: ${attack.saveDC}`);
          if (attack.damage) details.push(`Damage: ${attack.damage}${attack.damageType ? ' ' + attack.damageType : ''}`);
          if (attack.damage2) details.push(`Additional: ${attack.damage2}${attack.damageType2 ? ' ' + attack.damageType2 : ''}`);
          if (attack.properties) details.push(`Properties: ${attack.properties}`);

          children.push(new Paragraph({ text: details.join(' | ') }));
        });
      }

      // Spellcasting
      const hasSpellcasting = character.spellcastingAbility ||
        (character.spellSlots && Object.values(character.spellSlots).some(s => s.max)) ||
        (character.spellList && character.spellList.length > 0);

      if (hasSpellcasting) {
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        children.push(new Paragraph({ text: 'Spellcasting', heading: HeadingLevel.HEADING_2 }));
        if (character.spellcastingAbility) {
          children.push(new Paragraph({ text: `Spellcasting Ability: ${character.spellcastingAbility}` }));
        }
        if (character.spellSlots) {
          for (let level = 1; level <= 9; level++) {
            const slot = character.spellSlots[level];
            if (slot && slot.max) {
              children.push(new Paragraph({
                text: `Level ${level} Slots: ${slot.max - (slot.used || 0)} / ${slot.max}`
              }));
            }
          }
        }
        if (character.pactSlots && character.pactSlots.max) {
          children.push(new Paragraph({
            text: `Pact Slots (Level ${character.pactSlots.level}): ${character.pactSlots.max - (character.pactSlots.used || 0)} / ${character.pactSlots.max}`
          }));
        }

        // Spell List
        if (character.spellList && character.spellList.length > 0) {
          children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
          children.push(new Paragraph({ text: 'Spell List', heading: HeadingLevel.HEADING_3 }));

          // Group by level
          const spellsByLevel = {};
          for (let i = 0; i <= 9; i++) spellsByLevel[i] = [];
          character.spellList.forEach(spell => {
            const level = spell.level ?? 0;
            spellsByLevel[level].push(spell);
          });

          for (let level = 0; level <= 9; level++) {
            const spells = spellsByLevel[level];
            if (spells.length === 0) continue;

            const levelName = level === 0 ? 'Cantrips' : `Level ${level}`;
            children.push(new Paragraph({
              text: `${levelName} (${spells.length})`,
              bold: true,
              spacing: { before: 100, after: 50 }
            }));

            spells.forEach(spell => {
              const name = spell.name || spell.title || 'Unnamed Spell';
              const prepared = spell.prepared ? ' [Prepared]' : '';
              const concentration = spell.concentration ? ' (Concentration)' : '';
              const ritual = spell.ritual ? ' (Ritual)' : '';
              const details = [];
              if (spell.school) details.push(spell.school);
              if (spell.casting_time) details.push(spell.casting_time);
              if (spell.range) details.push(spell.range);
              if (spell.components) details.push(spell.components);
              if (spell.duration) details.push(spell.duration);

              children.push(new Paragraph({
                text: `${name}${prepared}${ritual}${concentration}`
              }));
              if (details.length > 0) {
                children.push(new Paragraph({
                  text: details.join(' | '),
                  italics: true
                }));
              }
              if (spell.body) {
                children.push(new Paragraph({ text: spell.body }));
              }
            });
          }
        }
      }

      // Features & Traits
      if (character.features) {
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        children.push(new Paragraph({ text: 'Features & Traits', heading: HeadingLevel.HEADING_2 }));
        children.push(new Paragraph({ text: character.features }));
      }

      // Equipment/Inventory
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      children.push(new Paragraph({ text: 'Equipment & Inventory', heading: HeadingLevel.HEADING_2 }));

      if (character.inventoryItems && character.inventoryItems.length > 0) {
        // Calculate total weight
        const totalWeight = character.inventoryItems.reduce((sum, item) => {
          return sum + ((item.weight || 0) * (item.quantity || 1));
        }, 0);

        children.push(new Paragraph({ text: `Total Weight: ${totalWeight} lbs`, bold: true }));
        children.push(new Paragraph({ text: '', spacing: { after: 100 } }));

        character.inventoryItems.forEach(item => {
          const details = [];
          details.push(item.name || 'Unnamed Item');
          if (item.quantity && item.quantity > 1) details.push(`Qty: ${item.quantity}`);
          if (item.weight) details.push(`Weight: ${item.weight * (item.quantity || 1)} lbs`);
          if (item.equipped) details.push('[Equipped]');
          if (item.attuned) details.push('[Attuned]');

          children.push(new Paragraph({ text: details.join(' | ') }));
          if (item.notes) {
            children.push(new Paragraph({ text: `  Notes: ${item.notes}`, italics: true }));
          }
        });
      } else if (character.inventory) {
        children.push(new Paragraph({ text: character.inventory }));
      }

      // Space for additional equipment notes
      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      children.push(new Paragraph({ text: 'Additional Equipment Notes:', bold: true }));
      children.push(new Paragraph({ text: '_'.repeat(80) }));
      children.push(new Paragraph({ text: '_'.repeat(80) }));
      children.push(new Paragraph({ text: '_'.repeat(80) }));

      // Conditions & Concentration
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      children.push(new Paragraph({ text: 'Conditions & Status', heading: HeadingLevel.HEADING_2 }));
      if (character.conditions) {
        children.push(new Paragraph({ text: `Current Conditions: ${character.conditions}` }));
      }
      if (character.concentrating && character.concentrationSpell) {
        children.push(new Paragraph({ text: `Concentrating on: ${character.concentrationSpell}` }));
      } else if (character.concentrating) {
        children.push(new Paragraph({ text: 'Concentrating on: (spell not specified)' }));
      }
      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      children.push(new Paragraph({ text: 'Additional Conditions/Status Notes:', bold: true }));
      children.push(new Paragraph({ text: '_'.repeat(80) }));
      children.push(new Paragraph({ text: '_'.repeat(80) }));

      // Notes
      if (character.notes) {
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        children.push(new Paragraph({ text: 'Notes', heading: HeadingLevel.HEADING_2 }));
        children.push(new Paragraph({ text: character.notes }));
      }

      // Table Notes
      if (character.tableNotes) {
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        children.push(new Paragraph({ text: 'Table Notes', heading: HeadingLevel.HEADING_2 }));
        children.push(new Paragraph({ text: character.tableNotes }));
      }

      // Extra Notes
      if (character.extraNotes) {
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        children.push(new Paragraph({ text: 'Additional Notes', heading: HeadingLevel.HEADING_2 }));
        children.push(new Paragraph({ text: character.extraNotes }));
      }

      // General write-in space
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      children.push(new Paragraph({ text: 'Session Notes / Additional Information', heading: HeadingLevel.HEADING_2 }));
      children.push(new Paragraph({ text: '_'.repeat(80) }));
      children.push(new Paragraph({ text: '_'.repeat(80) }));
      children.push(new Paragraph({ text: '_'.repeat(80) }));
      children.push(new Paragraph({ text: '_'.repeat(80) }));
      children.push(new Paragraph({ text: '_'.repeat(80) }));

      const licenseInfo = this.getLicenseNotices();
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      children.push(new Paragraph({ text: 'License & Attribution', heading: HeadingLevel.HEADING_2 }));
      const attributionParagraph = licenseInfo.licenseUrl
        ? `${licenseInfo.attributionText} (${licenseInfo.licenseUrl})`
        : licenseInfo.attributionText;
      children.push(new Paragraph({ text: attributionParagraph }));
      children.push(new Paragraph({ text: licenseInfo.productIdentityDisclaimer }));
      if (licenseInfo.srdUrl) {
        children.push(new Paragraph({ text: `SRD 5.2 Reference PDF: ${licenseInfo.srdUrl}` }));
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.sanitizeFilename(character.name || 'character')}-sheet.docx`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Word export error:', error);
      alert('Failed to export Word document: ' + error.message);
    }
  }

  /**
   * Print character sheet (browser print dialog)
   * @param {Object} character - Character data object
   */
  async printSheet(character) {
    if (!character) {
      alert('Please select a character first.');
      return;
    }

    try {
      const sheetHTML = await this.generateSheetHTML(character);
      const printWindow = window.open('', '_blank');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${character.name || 'Character'} - Character Sheet</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${sheetHTML}
          <div class="no-print" style="text-align: center; margin: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Print</button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">Close</button>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to print character sheet: ' + error.message);
    }
  }

  /**
   * Generate HTML for character sheet
   * @param {Object} character - Character data object
   * @returns {Promise<string>} HTML string
   */
  async generateSheetHTML(character) {
    // Portrait placeholder (portrait export disabled for now)
    const portraitHTML = '';

    return `
      <div style="font-family: 'Georgia', serif; width: 210mm; margin: 0 auto; padding: 20mm; background: white; color: #000; box-sizing: border-box;">
        ${portraitHTML}

        <h1 style="text-align: center; margin-bottom: 5px; font-size: 32px; border-bottom: 3px solid #8b0000; color: #000;">${character.name || 'Unnamed Character'}</h1>

        <div style="text-align: center; margin-bottom: 25px; font-style: italic; color: #333; font-size: 16px;">
          ${this.getCharacterSubtitle(character)}
        </div>

        <!-- Basic Information -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px;">
          ${this.createInfoBox('Player', character.playerName || 'N/A')}
          ${this.createInfoBox('Race', character.race || 'N/A')}
          ${this.createInfoBox('Class', this.getClassDisplay(character))}
          ${this.createInfoBox('Background', character.background || 'N/A')}
          ${this.createInfoBox('Level', character.level || '1')}
          ${this.createInfoBox('Alignment', character.alignment || 'N/A')}
        </div>

        <!-- Core Stats Row -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
          ${this.createStatBox('Proficiency Bonus', this.getProficiencyBonus(character.level), '#4a5568')}
          ${this.createStatBox('Armor Class', character.ac || '10', '#2d3748')}
          ${this.createStatBox('Initiative', character.initMod || '+0', '#2d3748')}
          ${this.createStatBox('Speed', character.speed || '30 ft', '#2d3748')}
        </div>

        <!-- Hit Points & Resources -->
        <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Hit Points & Resources</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
          ${this.createStatBox('Current HP', character.currentHP || 0, '#c53030')}
          ${this.createStatBox('Max HP', character.maxHP || '0', '#2d3748')}
          ${this.createStatBox('Temp HP', character.tempHP || '0', '#4299e1')}
          ${this.createStatBox('Hit Dice', `${character.hitDiceRemaining || character.level || 0}/${character.level || 0} ${character.hitDice || 'd8'}`, '#2d3748')}
          ${this.createStatBox('Inspiration', character.inspiration ? 'Yes' : 'No', '#805ad5')}
          ${this.createStatBox('Exhaustion', `${character.exhaustion || 0}/6`, '#d69e2e')}
        </div>

        <!-- Death Saves -->
        ${this.generateDeathSavesHTML(character)}

        <!-- Currency -->
        ${this.generateCurrencyHTML(character)}

        <!-- Custom Resources -->
        ${this.generateResourcesHTML(character)}

        <!-- Ability Scores -->
        <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Ability Scores</h2>
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px;">
          ${this.createAbilityBox('STR', character.stats?.str, character.statMods?.str)}
          ${this.createAbilityBox('DEX', character.stats?.dex, character.statMods?.dex)}
          ${this.createAbilityBox('CON', character.stats?.con, character.statMods?.con)}
          ${this.createAbilityBox('INT', character.stats?.int, character.statMods?.int)}
          ${this.createAbilityBox('WIS', character.stats?.wis, character.statMods?.wis)}
          ${this.createAbilityBox('CHA', character.stats?.cha, character.statMods?.cha)}
        </div>

        <!-- Saving Throws -->
        <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Saving Throws</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
          ${this.createSaveBox('Strength', character.savingThrows?.str, character.statMods?.str)}
          ${this.createSaveBox('Dexterity', character.savingThrows?.dex, character.statMods?.dex)}
          ${this.createSaveBox('Constitution', character.savingThrows?.con, character.statMods?.con)}
          ${this.createSaveBox('Intelligence', character.savingThrows?.int, character.statMods?.int)}
          ${this.createSaveBox('Wisdom', character.savingThrows?.wis, character.statMods?.wis)}
          ${this.createSaveBox('Charisma', character.savingThrows?.cha, character.statMods?.cha)}
        </div>

        <!-- Skills -->
        ${this.generateSkillsHTML(character)}

        <!-- Senses -->
        ${this.generateSensesHTML(character)}

        <!-- Attacks -->
        ${this.generateAttacksHTML(character)}

        <!-- Spellcasting -->
        ${this.generateSpellcastingHTML(character)}

        <!-- Features & Traits -->
        ${character.features ? `
          <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Features & Traits</h2>
          <div style="padding: 12px; border: 2px solid #ccc; white-space: pre-wrap; background: #fafafa; color: #000; font-size: 14px; line-height: 1.6;">${character.features}</div>
        ` : ''}

        <!-- Equipment -->
        ${this.generateInventoryHTML(character)}

        <!-- Conditions & Concentration -->
        ${this.generateConditionsHTML(character)}

        <!-- Notes -->
        ${character.notes ? `
          <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Notes</h2>
          <div style="padding: 12px; border: 2px solid #ccc; white-space: pre-wrap; background: #fafafa; color: #000; font-size: 14px; line-height: 1.6;">${character.notes}</div>
        ` : ''}

        ${character.roleNotes ? `
          <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Roleplay Notes</h2>
          <div style="padding: 12px; border: 2px solid #ccc; white-space: pre-wrap; background: #fafafa; color: #000; font-size: 14px; line-height: 1.6;">${character.roleNotes}</div>
        ` : ''}

        ${character.tableNotes ? `
          <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Table Notes</h2>
          <div style="padding: 12px; border: 2px solid #ccc; white-space: pre-wrap; background: #fafafa; color: #000; font-size: 14px; line-height: 1.6;">${character.tableNotes}</div>
        ` : ''}

        ${character.extraNotes ? `
          <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Additional Notes</h2>
          <div style="padding: 12px; border: 2px solid #ccc; white-space: pre-wrap; background: #fafafa; color: #000; font-size: 14px; line-height: 1.6;">${character.extraNotes}</div>
        ` : ''}

        <!-- Write-in Spaces -->
        <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Session Notes / Additional Information</h2>
        <div style="padding: 12px; border: 2px solid #ccc; background: #fafafa; color: #000; min-height: 150px;">
          <div style="border-bottom: 1px solid #ccc; height: 25px; margin-bottom: 5px;"></div>
          <div style="border-bottom: 1px solid #ccc; height: 25px; margin-bottom: 5px;"></div>
          <div style="border-bottom: 1px solid #ccc; height: 25px; margin-bottom: 5px;"></div>
          <div style="border-bottom: 1px solid #ccc; height: 25px; margin-bottom: 5px;"></div>
          <div style="border-bottom: 1px solid #ccc; height: 25px; margin-bottom: 5px;"></div>
        </div>

        ${this.generateLicenseSectionHTML()}
      </div>
    `;
  }

  /**
   * Helper methods for HTML generation
   */
  getCharacterSubtitle(character) {
    const parts = [];
    if (character.level) parts.push(`Level ${character.level}`);
    if (character.race) parts.push(character.race);
    if (character.charClass) parts.push(character.charClass);
    return parts.join(' ') || 'Adventurer';
  }

  getClassDisplay(character) {
    if (character.multiclass && character.classes && character.classes.length > 0) {
      return character.classes.map(c => `${c.className} ${c.level}`).join(', ');
    }
    return character.subclass ? `${character.charClass} (${character.subclass})` : (character.charClass || 'N/A');
  }

  getProficiencyBonus(level) {
    const lvl = parseInt(level) || 1;
    return '+' + (Math.ceil(lvl / 4) + 1);
  }

  createInfoBox(label, value) {
    return `
      <div style="border: 2px solid #333; padding: 10px; background: #fafafa;">
        <strong style="display: block; color: #8b0000; margin-bottom: 5px; font-size: 12px; text-transform: uppercase;">${label}:</strong>
        <span style="color: #000; font-size: 15px; font-weight: 500;">${value}</span>
      </div>
    `;
  }

  createStatBox(label, value, color = '#2d3748') {
    return `
      <div style="border: 3px solid #333; padding: 12px; text-align: center; background: #f7fafc;">
        <div style="font-size: 11px; color: ${color}; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">${label}</div>
        <div style="font-size: 22px; font-weight: bold; color: #000;">${value}</div>
      </div>
    `;
  }

  createAbilityBox(name, score, modifier) {
    const mod = modifier !== undefined ? modifier : this.calculateModifier(score);
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    return `
      <div style="border: 3px solid #333; padding: 10px; text-align: center; background: #f7fafc;">
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #000;">${name}</div>
        <div style="font-size: 28px; font-weight: bold; color: #8b0000; line-height: 1;">${score || '-'}</div>
        <div style="font-size: 18px; margin-top: 4px; color: #000; font-weight: 600;">${modStr}</div>
      </div>
    `;
  }

  createSaveBox(name, save, abilityMod) {
    const prof = save?.prof ? '●' : '○';
    const bonus = save?.bonus || (save?.prof ? this.getProficiencyBonus(1) : '') || '';
    return `
      <div style="border: 2px solid #333; padding: 10px; display: flex; align-items: center; background: #fafafa;">
        <span style="margin-right: 10px; font-size: 20px; color: #000; font-weight: bold;">${prof}</span>
        <span style="flex: 1; color: #000; font-weight: 500; font-size: 15px;">${name}</span>
        <span style="font-weight: bold; color: #000; font-size: 16px;">${bonus}</span>
      </div>
    `;
  }

  generateDeathSavesHTML(character) {
    if (!character.deathSaves) return '';
    const ds = character.deathSaves;
    return `
      <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Death Saves</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
        ${this.createStatBox('Successes', `${ds.successes || 0}/3`, '#38a169')}
        ${this.createStatBox('Failures', `${ds.failures || 0}/3`, '#e53e3e')}
        ${this.createStatBox('Stable', ds.stable ? 'Yes' : 'No', '#4299e1')}
      </div>
    `;
  }

  generateCurrencyHTML(character) {
    if (!character.currency) return '';
    const c = character.currency;
    return `
      <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Currency</h2>
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px;">
        ${this.createStatBox('CP', c.cp || 0, '#b7791f')}
        ${this.createStatBox('SP', c.sp || 0, '#a0aec0')}
        ${this.createStatBox('EP', c.ep || 0, '#68d391')}
        ${this.createStatBox('GP', c.gp || 0, '#d69e2e')}
        ${this.createStatBox('PP', c.pp || 0, '#cbd5e0')}
      </div>
    `;
  }

  generateResourcesHTML(character) {
    if (!character.resources) return '';
    const resources = ['res1', 'res2', 'res3']
      .map(key => character.resources[key])
      .filter(r => r && r.name);

    if (resources.length === 0) return '';

    let html = '<h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Custom Resources</h2>';
    html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">';

    resources.forEach(res => {
      html += `
        <div style="border: 3px solid #333; padding: 12px; text-align: center; background: #f7fafc;">
          <div style="font-size: 12px; color: #4a5568; font-weight: bold; margin-bottom: 6px;">${res.name}</div>
          <div style="font-size: 22px; font-weight: bold; color: #000;">${res.current || 0} / ${res.max || 0}</div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  generateSkillsHTML(character) {
    if (!character.skills) return '';

    const skillNames = {
      acrobatics: 'Acrobatics (Dex)', animalHandling: 'Animal Handling (Wis)', arcana: 'Arcana (Int)',
      athletics: 'Athletics (Str)', deception: 'Deception (Cha)', history: 'History (Int)',
      insight: 'Insight (Wis)', intimidation: 'Intimidation (Cha)', investigation: 'Investigation (Int)',
      medicine: 'Medicine (Wis)', nature: 'Nature (Int)', perception: 'Perception (Wis)',
      performance: 'Performance (Cha)', persuasion: 'Persuasion (Cha)', religion: 'Religion (Int)',
      sleightOfHand: 'Sleight of Hand (Dex)', stealth: 'Stealth (Dex)', survival: 'Survival (Wis)'
    };

    let html = '<h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Skills</h2>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px;">';

    Object.keys(skillNames).forEach(skillKey => {
      const skill = character.skills[skillKey];
      const prof = skill?.exp ? '◆' : skill?.prof ? '●' : '○';
      const bonus = skill?.bonus || '';
      html += `
        <div style="border: 2px solid #333; padding: 8px; display: flex; align-items: center; font-size: 14px; background: #fafafa;">
          <span style="margin-right: 10px; font-size: 18px; color: #000; font-weight: bold;">${prof}</span>
          <span style="flex: 1; color: #000; font-weight: 500;">${skillNames[skillKey]}</span>
          <span style="font-weight: bold; color: #000; font-size: 15px;">${bonus}</span>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  generateSensesHTML(character) {
    if (!character.senses) return '';
    const s = character.senses;

    let html = '<h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Senses</h2>';
    html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">';
    html += this.createStatBox('Passive Perception', s.passivePerception || '10', '#4a5568');
    html += this.createStatBox('Passive Investigation', s.passiveInvestigation || '10', '#4a5568');
    html += this.createStatBox('Passive Insight', s.passiveInsight || '10', '#4a5568');
    html += '</div>';

    if (s.notes) {
      html += `<div style="padding: 10px; border: 2px solid #ccc; background: #fafafa; color: #000; margin-bottom: 20px;"><strong>Sense Notes:</strong> ${s.notes}</div>`;
    }

    return html;
  }

  generateAttacksHTML(character) {
    if (!character.attacks || character.attacks.length === 0) return '';

    let html = '<h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Attacks & Actions</h2>';

    character.attacks.forEach(attack => {
      const attackType = attack.type || 'melee-weapon';
      const range = attack.range || '';
      const bonus = attack.bonus || attack.attackBonus || '';
      const saveDC = attack.saveDC || '';
      const damage = attack.damage || '';
      const damageType = attack.damageType || '';
      const damage2 = attack.damage2 || '';
      const damageType2 = attack.damageType2 || '';
      const properties = attack.properties || '';

      html += `
        <div style="border: 3px solid #333; padding: 12px; margin-bottom: 15px; background: #fafafa;">
          <div style="font-size: 18px; font-weight: bold; color: #8b0000; margin-bottom: 8px;">${attack.name || 'Unnamed Attack'}</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px;">
            <div><strong>Type:</strong> ${this.formatAttackType(attackType)}</div>
            ${range ? `<div><strong>Range:</strong> ${range}</div>` : '<div></div>'}
            ${bonus ? `<div><strong>To Hit:</strong> ${bonus}</div>` : ''}
            ${saveDC ? `<div><strong>Save DC:</strong> ${saveDC}</div>` : ''}
          </div>
          ${damage ? `
            <div style="margin-top: 8px;">
              <strong>Damage:</strong> ${damage}${damageType ? ` ${damageType}` : ''}
            </div>
          ` : ''}
          ${damage2 ? `
            <div style="margin-top: 4px;">
              <strong>Additional:</strong> ${damage2}${damageType2 ? ` ${damageType2}` : ''}
            </div>
          ` : ''}
          ${properties ? `
            <div style="margin-top: 8px; font-style: italic; color: #555;">
              <strong>Properties:</strong> ${properties}
            </div>
          ` : ''}
        </div>
      `;
    });

    return html;
  }

  formatAttackType(type) {
    const types = {
      'melee-weapon': 'Melee Weapon Attack',
      'ranged-weapon': 'Ranged Weapon Attack',
      'melee-spell': 'Melee Spell Attack',
      'ranged-spell': 'Ranged Spell Attack',
      'save': 'Saving Throw'
    };
    return types[type] || type;
  }

  generateSpellcastingHTML(character) {
    const hasSpellcasting = character.spellcastingAbility ||
      (character.spellSlots && Object.values(character.spellSlots).some(s => s && s.max)) ||
      (character.pactSlots && character.pactSlots.max) ||
      (character.spellList && character.spellList.length > 0);

    if (!hasSpellcasting) return '';

    let html = '<h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Spellcasting</h2>';

    if (character.spellcastingAbility) {
      html += `<div style="margin-bottom: 15px; font-size: 15px; color: #000;"><strong>Spellcasting Ability:</strong> ${character.spellcastingAbility.toUpperCase()}</div>`;
    }

    if (character.spellSlots) {
      html += '<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 15px;">';
      for (let level = 1; level <= 9; level++) {
        const slot = character.spellSlots[level];
        if (slot && slot.max) {
          const remaining = slot.max - (slot.used || 0);
          html += `
            <div style="border: 3px solid #333; padding: 10px; text-align: center; background: #f7fafc;">
              <div style="font-size: 11px; color: #4a5568; font-weight: bold; margin-bottom: 4px;">LEVEL ${level}</div>
              <div style="font-size: 20px; font-weight: bold; color: #000;">${remaining} / ${slot.max}</div>
            </div>
          `;
        }
      }
      html += '</div>';
    }

    if (character.pactSlots && character.pactSlots.max) {
      const remaining = character.pactSlots.max - (character.pactSlots.used || 0);
      html += `
        <div style="border: 3px solid #6b46c1; padding: 12px; background: #faf5ff; margin-bottom: 20px;">
          <strong style="color: #000; font-size: 15px;">Pact Magic Slots (Level ${character.pactSlots.level || '1'}): </strong>
          <span style="font-size: 18px; font-weight: bold; color: #000;">${remaining} / ${character.pactSlots.max}</span>
        </div>
      `;
    }

    // Spell List
    if (character.spellList && character.spellList.length > 0) {
      html += this.generateSpellListHTML(character.spellList);
    }

    return html;
  }

  generateSpellListHTML(spellList) {
    // Group spells by level
    const spellsByLevel = {};
    for (let i = 0; i <= 9; i++) {
      spellsByLevel[i] = [];
    }

    spellList.forEach(spell => {
      const level = spell.level ?? 0;
      spellsByLevel[level].push(spell);
    });

    let html = '<div style="margin-top: 20px;">';
    html += '<h3 style="color: #000; font-size: 16px; margin-bottom: 12px; border-bottom: 2px solid #8b0000; padding-bottom: 4px;">Spell List</h3>';

    for (let level = 0; level <= 9; level++) {
      const spells = spellsByLevel[level];
      if (spells.length === 0) continue;

      const levelName = level === 0 ? 'Cantrips' : `Level ${level}`;
      html += `<div style="margin-bottom: 20px;">`;
      html += `<h4 style="color: #8b0000; font-size: 15px; margin-bottom: 10px;">${levelName} (${spells.length})</h4>`;

      spells.forEach(spell => {
        const name = spell.name || spell.title || 'Unnamed Spell';
        const school = spell.school || '';
        const castingTime = spell.casting_time || '';
        const range = spell.range || '';
        const components = spell.components || '';
        const duration = spell.duration || '';
        const concentration = spell.concentration ? ' (Concentration)' : '';
        const ritual = spell.ritual ? ' (Ritual)' : '';
        const prepared = spell.prepared ? ' ●' : '';
        const body = spell.body || '';

        html += `
          <div style="border: 2px solid #333; padding: 10px; margin-bottom: 10px; background: #fafafa;">
            <div style="font-size: 16px; font-weight: bold; color: #000; margin-bottom: 4px;">
              ${name}${prepared}${ritual}${concentration}
            </div>
            <div style="font-size: 13px; color: #555; font-style: italic; margin-bottom: 6px;">
              ${school ? `${school}` : ''}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 13px; color: #000; margin-bottom: 6px;">
              ${castingTime ? `<div><strong>Casting Time:</strong> ${castingTime}</div>` : ''}
              ${range ? `<div><strong>Range:</strong> ${range}</div>` : ''}
              ${components ? `<div><strong>Components:</strong> ${components}</div>` : ''}
              ${duration ? `<div><strong>Duration:</strong> ${duration}</div>` : ''}
            </div>
            ${body ? `<div style="font-size: 13px; color: #000; line-height: 1.5; margin-top: 6px; padding-top: 6px; border-top: 1px solid #ddd;">${body}</div>` : ''}
          </div>
        `;
      });

      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  generateInventoryHTML(character) {
    if (!character.inventoryItems || character.inventoryItems.length === 0) {
      if (character.inventory) {
        return `
          <h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Equipment & Inventory</h2>
          <div style="padding: 12px; border: 2px solid #ccc; white-space: pre-wrap; background: #fafafa; color: #000; font-size: 14px; line-height: 1.6;">${character.inventory}</div>
        `;
      }
      return '';
    }

    // Calculate total weight
    const totalWeight = character.inventoryItems.reduce((sum, item) => {
      return sum + ((item.weight || 0) * (item.quantity || 1));
    }, 0);

    let html = '<h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Equipment & Inventory</h2>';
    html += `<div style="padding: 12px; border: 2px solid #ccc; background: #fafafa; margin-bottom: 15px;">`;
    html += `<strong style="font-size: 16px; color: #000;">Total Weight: ${totalWeight} lbs</strong>`;
    html += `</div>`;

    // Group items by equipped status
    const equipped = character.inventoryItems.filter(i => i.equipped);
    const notEquipped = character.inventoryItems.filter(i => !i.equipped);

    if (equipped.length > 0) {
      html += '<div style="margin-bottom: 15px;">';
      html += '<h3 style="color: #8b0000; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #8b0000; padding-bottom: 4px;">Equipped</h3>';
      equipped.forEach(item => {
        html += this.createInventoryItemHTML(item);
      });
      html += '</div>';
    }

    if (notEquipped.length > 0) {
      html += '<div style="margin-bottom: 15px;">';
      html += '<h3 style="color: #8b0000; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #8b0000; padding-bottom: 4px;">Other Items</h3>';
      notEquipped.forEach(item => {
        html += this.createInventoryItemHTML(item);
      });
      html += '</div>';
    }

    // Add write-in space for additional equipment
    html += `
      <div style="margin-top: 20px; padding: 12px; border: 2px solid #ccc; background: #fafafa;">
        <strong style="color: #000;">Additional Equipment Notes:</strong>
        <div style="border-bottom: 1px solid #ccc; height: 25px; margin-top: 10px; margin-bottom: 5px;"></div>
        <div style="border-bottom: 1px solid #ccc; height: 25px; margin-bottom: 5px;"></div>
        <div style="border-bottom: 1px solid #ccc; height: 25px; margin-bottom: 5px;"></div>
      </div>
    `;

    return html;
  }

  createInventoryItemHTML(item) {
    const quantity = item.quantity && item.quantity > 1 ? `×${item.quantity}` : '';
    const weight = item.weight ? ` (${item.weight * (item.quantity || 1)} lbs)` : '';
    const attuned = item.attuned ? ' [Attuned]' : '';
    const notes = item.notes ? `<div style="font-size: 12px; color: #555; font-style: italic; margin-top: 4px;">Notes: ${item.notes}</div>` : '';

    return `
      <div style="border: 2px solid #333; padding: 10px; margin-bottom: 8px; background: #ffffff;">
        <div style="font-size: 15px; font-weight: bold; color: #000;">
          ${item.name || 'Unnamed Item'} ${quantity}${weight}${attuned}
        </div>
        ${notes}
      </div>
    `;
  }

  generateConditionsHTML(character) {
    const hasConditions = character.conditions || character.concentrating;
    if (!hasConditions) return '';

    let html = '<h2 style="background: #8b0000; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 18px;">Conditions & Status</h2>';
    html += '<div style="padding: 12px; border: 2px solid #ccc; background: #fafafa; margin-bottom: 15px;">';

    if (character.conditions) {
      html += `<div style="margin-bottom: 10px;"><strong style="color: #000;">Current Conditions:</strong> ${character.conditions}</div>`;
    }

    if (character.concentrating) {
      const spell = character.concentrationSpell || '(spell not specified)';
      html += `<div style="margin-bottom: 10px;"><strong style="color: #000;">Concentrating on:</strong> ${spell}</div>`;
    }

    html += '</div>';

    // Add write-in space
    html += `
      <div style="padding: 12px; border: 2px solid #ccc; background: #fafafa; margin-bottom: 20px;">
        <strong style="color: #000;">Additional Conditions/Status Notes:</strong>
        <div style="border-bottom: 1px solid #ccc; height: 25px; margin-top: 10px; margin-bottom: 5px;"></div>
        <div style="border-bottom: 1px solid #ccc; height: 25px; margin-bottom: 5px;"></div>
      </div>
    `;

    return html;
  }

  calculateModifier(score) {
    if (!score) return 0;
    return Math.floor((parseInt(score) - 10) / 2);
  }

  /**
   * Utility methods
   */
  async loadLibrary(name, url) {
    if (name === 'jspdf' && window.jspdf) return;
    if (name === 'html2canvas' && window.html2canvas) return;
    if (name === 'docx' && window.docx) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${name}`));
      document.head.appendChild(script);
    });
  }

  createTempContainer(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = 'white';
    document.body.appendChild(container);
    return container;
  }

  async waitForImages(container) {
    const images = container.querySelectorAll('img');
    const promises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Still resolve even if image fails
        setTimeout(resolve, 5000); // Timeout after 5 seconds
      });
    });
    await Promise.all(promises);
  }

  /**
   * Render portrait to a data URL with all transformations applied
   * This matches the CSS rendering in the Character Manager preview
   * @param {Object} character - Character data object
   * @returns {Promise<string>} Data URL of rendered portrait
   */
  async renderPortraitToDataURL(character) {
    if (!character.portraitData) return null;

    try {
      console.log('Loading portrait image...');
      // Load the image first
      const img = new Image();
      // Don't set crossOrigin for data URLs (causes issues)
      if (!character.portraitData.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.src = character.portraitData;

      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('Portrait image loaded:', img.width, 'x', img.height);
          resolve();
        };
        img.onerror = (e) => {
          console.error('Image load error:', e);
          reject(e);
        };
        setTimeout(() => reject(new Error('Portrait load timeout')), 10000);
      });

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const size = 200;
      canvas.width = size;
      canvas.height = size;

      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Get transform settings
      const settings = character.portraitSettings || {};
      const scale = settings.scale || 1;
      const offsetX = settings.offsetX || 0;
      const offsetY = settings.offsetY || 0;

      console.log('Portrait settings:', { scale, offsetX, offsetY });

      // Apply circular clipping
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      // Calculate dimensions (object-fit: cover behavior)
      // The image should fill the container while maintaining aspect ratio
      const imgAspect = img.width / img.height;
      const containerAspect = 1; // Square container

      let sourceWidth, sourceHeight, sourceX, sourceY;

      if (imgAspect > containerAspect) {
        // Image is wider - crop sides
        sourceHeight = img.height;
        sourceWidth = img.height * containerAspect;
        sourceX = (img.width - sourceWidth) / 2;
        sourceY = 0;
      } else {
        // Image is taller - crop top/bottom
        sourceWidth = img.width;
        sourceHeight = img.width / containerAspect;
        sourceX = 0;
        sourceY = (img.height - sourceHeight) / 2;
      }

      // Now apply the scale and offset transformations
      // Draw at the center, then apply transforms
      const drawSize = size * scale;
      const drawX = (size / 2) - (drawSize / 2) + offsetX;
      const drawY = (size / 2) - (drawSize / 2) + offsetY;

      // Draw the cropped and scaled image
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,  // Source rectangle
        drawX, drawY, drawSize, drawSize              // Destination rectangle
      );

      ctx.restore();

      console.log('Portrait rendered to canvas');
      // Convert to data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error rendering portrait to data URL:', error);
      return null;
    }
  }

  async getPortraitBlob(character) {
    if (!character.portraitData) return null;

    try {
      const dataURL = await this.renderPortraitToDataURL(character);
      if (!dataURL) return null;

      // Convert data URL to blob
      const response = await fetch(dataURL);
      return await response.blob();
    } catch (error) {
      console.error('Error creating portrait blob:', error);
      return null;
    }
  }

  generateLicenseSectionHTML() {
    const info = this.getLicenseNotices();
    const attribution = this.formatLicenseAttribution(info.attributionText, info.licenseUrl);
    const disclaimer = this.escapeHtml(info.productIdentityDisclaimer);
    const srdUrl = info.srdUrl ? this.escapeHtml(info.srdUrl) : '';
    const srdLink = srdUrl
      ? `<p style="margin: 0;">SRD 5.2 Reference PDF: <a href="${srdUrl}" target="_blank" rel="noopener noreferrer">Download from Wizards</a></p>`
      : '';
    return `
        <section style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #4a5568; line-height: 1.5;">
          <strong style="display: block; text-transform: uppercase; letter-spacing: 0.08em;">License &amp; Attribution</strong>
          <p style="margin: 8px 0 4px 0;">${attribution}</p>
          <p style="margin: 0;">${disclaimer}</p>
          ${srdLink}
        </section>
    `;
  }

  getLicenseNotices() {
    if (typeof window !== 'undefined') {
      if (typeof window.getSrdLicenseNotices === 'function') {
        return window.getSrdLicenseNotices();
      }
      if (window.SRDLicensing) {
        return {
          attributionText: window.SRDLicensing.attributionText || CHARACTER_EXPORT_LICENSE_DEFAULTS.attributionText,
          productIdentityDisclaimer: window.SRDLicensing.productIdentityDisclaimer || CHARACTER_EXPORT_LICENSE_DEFAULTS.productIdentityDisclaimer,
          licenseUrl: window.SRDLicensing.licenseUrl || CHARACTER_EXPORT_LICENSE_DEFAULTS.licenseUrl,
          srdUrl: window.SRDLicensing.srdUrl || CHARACTER_EXPORT_LICENSE_DEFAULTS.srdUrl
        };
      }
    }
    return { ...CHARACTER_EXPORT_LICENSE_DEFAULTS };
  }

  escapeHtml(text = '') {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return text.replace(/[&<>"']/g, (char) => entities[char] || char);
  }

  formatLicenseAttribution(text, url) {
    const safeText = this.escapeHtml(text);
    if (!url) {
      return safeText;
    }
    const encodedPhrase = this.escapeHtml(CHARACTER_EXPORT_LICENSE_PHRASE);
    const anchor = `<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${encodedPhrase}</a>`;
    if (!safeText.includes(encodedPhrase)) {
      return `${safeText} ${anchor}`;
    }
    return safeText.replace(encodedPhrase, anchor);
  }

  sanitizeFilename(name) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }
}

// Create global instance
window.CharacterSheetExporter = CharacterSheetExporter;
window.characterSheetExporter = new CharacterSheetExporter();
})();
