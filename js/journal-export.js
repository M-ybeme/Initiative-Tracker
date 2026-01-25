// Journal Export Functionality
// Separate from Quill to avoid conflicts

const JOURNAL_LICENSE_PHRASE = 'Creative Commons Attribution 4.0 International License';
const SRD_PDF_URL = 'https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf';
const JOURNAL_LICENSE_DEFAULTS = {
  attributionText: 'This work includes material from the System Reference Document 5.1 by Wizards of the Coast LLC and is licensed for our use under the Creative Commons Attribution 4.0 International License.',
  productIdentityDisclaimer: 'The DM\'s Toolbox references rules and mechanics from the Dungeons & Dragons 5e System Reference Document 5.1. Wizards of the Coast, Dungeons & Dragons, Forgotten Realms, Ravenloft, Eberron, the dragon ampersand, beholders, githyanki, githzerai, mind flayers, yuan-ti, and all other Wizards of the Coast product identity are trademarks of Wizards of the Coast LLC in the U.S.A. and other countries. The DM\'s Toolbox is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC.',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  srdUrl: SRD_PDF_URL
};

const JournalExport = {
  getLicenseNotices() {
    if (typeof window !== 'undefined') {
      if (typeof window.getSrdLicenseNotices === 'function') {
        return window.getSrdLicenseNotices();
      }
      if (window.SRDLicensing) {
        return {
          attributionText: window.SRDLicensing.attributionText || JOURNAL_LICENSE_DEFAULTS.attributionText,
          productIdentityDisclaimer: window.SRDLicensing.productIdentityDisclaimer || JOURNAL_LICENSE_DEFAULTS.productIdentityDisclaimer,
          licenseUrl: window.SRDLicensing.licenseUrl || JOURNAL_LICENSE_DEFAULTS.licenseUrl,
          srdUrl: window.SRDLicensing.srdUrl || JOURNAL_LICENSE_DEFAULTS.srdUrl
        };
      }
    }
    return { ...JOURNAL_LICENSE_DEFAULTS };
  },

  buildPlainTextLicenseSection() {
    const info = this.getLicenseNotices();
    const lines = ['', 'License & Attribution', '---------------------', info.attributionText];
    if (info.licenseUrl) {
      lines.push(`License: ${info.licenseUrl}`);
    }
    if (info.srdUrl) {
      lines.push(`SRD 5.1 PDF: ${info.srdUrl}`);
    }
    lines.push(info.productIdentityDisclaimer);
    return lines.join('\n');
  },

  buildMarkdownLicenseSection() {
    const info = this.getLicenseNotices();
    const attribution = this.wrapLicensePhrase(info.attributionText, info.licenseUrl, 'markdown');
    const lines = ['\n---', '## License & Attribution', attribution];
    if (info.srdUrl) {
      lines.push('', `[SRD 5.1 Reference PDF](${info.srdUrl})`);
    }
    lines.push('', info.productIdentityDisclaimer);
    return lines.join('\n');
  },

  buildDocxLicenseParagraphs({ Paragraph, HeadingLevel }) {
    const info = this.getLicenseNotices();
    const attribution = info.licenseUrl ? `${info.attributionText} (${info.licenseUrl})` : info.attributionText;
    const paragraphs = [
      new Paragraph({ text: '', spacing: { after: 200 } }),
      new Paragraph({ text: 'License & Attribution', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: attribution }),
      new Paragraph({ text: info.productIdentityDisclaimer })
    ];
    if (info.srdUrl) {
      paragraphs.push(new Paragraph({ text: `SRD 5.1 Reference PDF: ${info.srdUrl}` }));
    }
    return paragraphs;
  },

  appendPdfLicense(doc, heading = 'License & Attribution') {
    const info = this.getLicenseNotices();
    const attribution = info.licenseUrl ? `${info.attributionText} (${info.licenseUrl})` : info.attributionText;
    doc.addPage();
    let yPosition = 20;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(heading, 20, yPosition);
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    const attributionLines = doc.splitTextToSize(attribution, 170);
    doc.text(attributionLines, 20, yPosition);
    yPosition += attributionLines.length * 6;
    const disclaimerLines = doc.splitTextToSize(info.productIdentityDisclaimer, 170);
    yPosition += 6;
    doc.text(disclaimerLines, 20, yPosition);
    if (info.srdUrl) {
      const srdLines = doc.splitTextToSize(`SRD 5.1 Reference PDF: ${info.srdUrl}`, 170);
      yPosition += 6;
      doc.text(srdLines, 20, yPosition);
    }
  },

  wrapLicensePhrase(text, url, format) {
    if (!url) {
      return text;
    }
    if (!text.includes(JOURNAL_LICENSE_PHRASE)) {
      return `${text} (${url})`;
    }
    if (format === 'markdown') {
      return text.replace(JOURNAL_LICENSE_PHRASE, `[${JOURNAL_LICENSE_PHRASE}](${url})`);
    }
    return text.replace(JOURNAL_LICENSE_PHRASE, `${JOURNAL_LICENSE_PHRASE} (${url})`);
  },

  // Convert Quill Delta/HTML to plain text
  toPlainText(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  },

  // Convert Quill HTML to Markdown
  toMarkdown(htmlContent, entryName) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    let markdown = `# ${entryName}\n\n`;

    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      let result = '';
      const tagName = node.tagName.toLowerCase();

      switch (tagName) {
        case 'h1':
          result = `# ${node.textContent}\n\n`;
          break;
        case 'h2':
          result = `## ${node.textContent}\n\n`;
          break;
        case 'h3':
          result = `### ${node.textContent}\n\n`;
          break;
        case 'p':
          let content = '';
          node.childNodes.forEach(child => {
            content += processNode(child);
          });
          result = content + '\n\n';
          break;
        case 'strong':
        case 'b':
          result = `**${node.textContent}**`;
          break;
        case 'em':
        case 'i':
          result = `*${node.textContent}*`;
          break;
        case 'u':
          result = `<u>${node.textContent}</u>`;
          break;
        case 's':
        case 'strike':
          result = `~~${node.textContent}~~`;
          break;
        case 'a':
          result = `[${node.textContent}](${node.href})`;
          break;
        case 'img':
          result = `![${node.alt || 'Image'}](${node.src})\n\n`;
          break;
        case 'ul':
          node.querySelectorAll('li').forEach(li => {
            result += `- ${li.textContent}\n`;
          });
          result += '\n';
          break;
        case 'ol':
          node.querySelectorAll('li').forEach((li, index) => {
            result += `${index + 1}. ${li.textContent}\n`;
          });
          result += '\n';
          break;
        case 'br':
          result = '\n';
          break;
        default:
          node.childNodes.forEach(child => {
            result += processNode(child);
          });
      }

      return result;
    };

    tempDiv.childNodes.forEach(child => {
      markdown += processNode(child);
    });

    return markdown.trim();
  },

  // Export as TXT
  exportAsTXT(entryName, htmlContent) {
    const text = `${entryName}\n${'='.repeat(entryName.length)}\n\n${this.toPlainText(htmlContent)}${this.buildPlainTextLicenseSection()}`;
    const blob = new Blob([text], { type: 'text/plain' });
    this.download(blob, `${entryName}.txt`);
  },

  // Export as Markdown
  exportAsMarkdown(entryName, htmlContent) {
    const markdown = this.toMarkdown(htmlContent, entryName) + this.buildMarkdownLicenseSection();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    this.download(blob, `${entryName}.md`);
  },

  // Export as Word (DOCX) - requires docx library
  async exportAsWord(entryName, htmlContent) {
    if (typeof docx === 'undefined') {
      alert('Word export library not loaded. Please check your internet connection.');
      return;
    }

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const children = [];

    // Add title
    children.push(
      new Paragraph({
        text: entryName,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      })
    );

    const processNode = (node, parentStyle = {}) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.trim()) {
          return new TextRun({
            text: node.textContent,
            ...parentStyle
          });
        }
        return null;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const tagName = node.tagName.toLowerCase();

      switch (tagName) {
        case 'h1':
          return new Paragraph({
            text: node.textContent,
            heading: HeadingLevel.HEADING_1
          });
        case 'h2':
          return new Paragraph({
            text: node.textContent,
            heading: HeadingLevel.HEADING_2
          });
        case 'h3':
          return new Paragraph({
            text: node.textContent,
            heading: HeadingLevel.HEADING_3
          });
        case 'p':
          const textRuns = [];
          node.childNodes.forEach(child => {
            const result = processTextNode(child);
            if (result) {
              if (Array.isArray(result)) {
                textRuns.push(...result);
              } else {
                textRuns.push(result);
              }
            }
          });
          return new Paragraph({
            children: textRuns.length > 0 ? textRuns : [new TextRun({ text: '' })]
          });
        case 'br':
          return new Paragraph({
            children: [new TextRun({ text: '' })]
          });
        default:
          return null;
      }
    };

    const processTextNode = (node, style = {}) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.trim()) {
          return new TextRun({
            text: node.textContent,
            ...style
          });
        }
        return null;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const tagName = node.tagName.toLowerCase();
      let newStyle = { ...style };

      switch (tagName) {
        case 'strong':
        case 'b':
          newStyle.bold = true;
          break;
        case 'em':
        case 'i':
          newStyle.italics = true;
          break;
        case 'u':
          newStyle.underline = {};
          break;
        case 's':
        case 'strike':
          newStyle.strike = true;
          break;
      }

      const results = [];
      node.childNodes.forEach(child => {
        const result = processTextNode(child, newStyle);
        if (result) {
          if (Array.isArray(result)) {
            results.push(...result);
          } else {
            results.push(result);
          }
        }
      });

      return results.length > 0 ? results : null;
    };

    tempDiv.childNodes.forEach(child => {
      const result = processNode(child);
      if (result) {
        children.push(result);
      }
    });

    children.push(...this.buildDocxLicenseParagraphs({ Paragraph, HeadingLevel }));

    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    const blob = await Packer.toBlob(doc);
    this.download(blob, `${entryName}.docx`);
  },

  // Export as PDF - requires jsPDF and html2canvas
  async exportAsPDF(entryName, htmlContent) {
    if (typeof jspdf === 'undefined') {
      alert('PDF export library not loaded. Please check your internet connection.');
      return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(entryName, 20, 20);

    // Convert HTML to text and add to PDF
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');

    // Split text to fit page width
    const splitText = doc.splitTextToSize(plainText, 170);
    doc.text(splitText, 20, 35);

    this.appendPdfLicense(doc);
    doc.save(`${entryName}.pdf`);
  },

  // Helper to trigger download
  download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Main export function called from modal
  async handleExport(format, entryName, htmlContent) {
    if (!entryName || !htmlContent) {
      alert('Please save your entry before exporting.');
      return;
    }

    const sanitizedName = entryName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    try {
      switch (format) {
        case 'txt':
          this.exportAsTXT(sanitizedName, htmlContent);
          break;
        case 'markdown':
          this.exportAsMarkdown(sanitizedName, htmlContent);
          break;
        case 'word':
          await this.exportAsWord(sanitizedName, htmlContent);
          break;
        case 'pdf':
          await this.exportAsPDF(sanitizedName, htmlContent);
          break;
        default:
          alert('Invalid export format');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Error exporting as ${format.toUpperCase()}: ${error.message}`);
    }
  },

  // Bulk export multiple entries
  async handleBulkExport(format, entries) {
    if (!entries || entries.length === 0) {
      alert('No entries selected for export.');
      return;
    }

    try {
      // For each selected entry, export it
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const sanitizedName = entry.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        // Add delay between exports to prevent browser from blocking downloads
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        switch (format) {
          case 'txt':
            this.exportAsTXT(sanitizedName, entry.content);
            break;
          case 'markdown':
            this.exportAsMarkdown(sanitizedName, entry.content);
            break;
          case 'word':
            await this.exportAsWord(sanitizedName, entry.content);
            break;
          case 'pdf':
            await this.exportAsPDF(sanitizedName, entry.content);
            break;
        }
      }

      // Show success message
      const message = `Successfully exported ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}!`;
      if (typeof showToast === 'function') {
        showToast(message, 'success');
      } else {
        alert(message);
      }
    } catch (error) {
      console.error('Bulk export error:', error);
      alert(`Error during bulk export: ${error.message}`);
    }
  },

  // Create a combined export of all entries (single file)
  async handleBulkExportCombined(format, entries, filename = 'journal_export') {
    if (!entries || entries.length === 0) {
      alert('No entries selected for export.');
      return;
    }

    const sanitizedName = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    try {
      // Sort entries by timestamp
      const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

      switch (format) {
        case 'txt': {
          let combinedText = '';
          sortedEntries.forEach((entry, index) => {
            if (index > 0) combinedText += '\n\n' + '='.repeat(80) + '\n\n';
            combinedText += `${entry.name}\n${'='.repeat(entry.name.length)}\n\n`;
            combinedText += this.toPlainText(entry.content);
          });
          combinedText += this.buildPlainTextLicenseSection();
          const blob = new Blob([combinedText], { type: 'text/plain' });
          this.download(blob, `${sanitizedName}.txt`);
          break;
        }

        case 'markdown': {
          let combinedMarkdown = `# Journal Export\n\n`;
          sortedEntries.forEach((entry, index) => {
            if (index > 0) combinedMarkdown += '\n\n---\n\n';
            combinedMarkdown += this.toMarkdown(entry.content, entry.name) + '\n';
          });
          combinedMarkdown += this.buildMarkdownLicenseSection();
          const blob = new Blob([combinedMarkdown], { type: 'text/markdown' });
          this.download(blob, `${sanitizedName}.md`);
          break;
        }

        case 'word': {
          if (typeof docx === 'undefined') {
            alert('Word export library not loaded.');
            return;
          }

          const { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } = docx;
          const children = [];

          // Add main title
          children.push(
            new Paragraph({
              text: 'Journal Export',
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 400 }
            })
          );

          sortedEntries.forEach((entry, index) => {
            if (index > 0) {
              children.push(new Paragraph({ children: [new PageBreak()] }));
            }

            // Add entry title
            children.push(
              new Paragraph({
                text: entry.name,
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 200 }
              })
            );

            // Add entry content (simplified for combined export)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = entry.content;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';

            plainText.split('\n').forEach(line => {
              if (line.trim()) {
                children.push(new Paragraph({ text: line }));
              }
            });
          });

          children.push(...this.buildDocxLicenseParagraphs({ Paragraph, HeadingLevel }));

          const doc = new Document({
            sections: [{ properties: {}, children: children }]
          });

          const blob = await Packer.toBlob(doc);
          this.download(blob, `${sanitizedName}.docx`);
          break;
        }

        case 'pdf': {
          if (typeof jspdf === 'undefined') {
            alert('PDF export library not loaded.');
            return;
          }

          const { jsPDF } = jspdf;
          const doc = new jsPDF();
          let yPosition = 20;

          // Add main title
          doc.setFontSize(24);
          doc.setFont(undefined, 'bold');
          doc.text('Journal Export', 20, yPosition);
          yPosition += 15;

          sortedEntries.forEach((entry, index) => {
            if (index > 0) {
              doc.addPage();
              yPosition = 20;
            }

            // Entry title
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text(entry.name, 20, yPosition);
            yPosition += 10;

            // Entry content
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = entry.content;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';

            const splitText = doc.splitTextToSize(plainText, 170);
            doc.text(splitText, 20, yPosition);
          });

          this.appendPdfLicense(doc, 'Journal Export – License & Attribution');
          doc.save(`${sanitizedName}.pdf`);
          break;
        }

        default:
          alert('Invalid export format');
      }

      // Show success message
      const message = `Successfully exported ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} as a combined file!`;
      if (typeof showToast === 'function') {
        showToast(message, 'success');
      } else {
        alert(message);
      }
    } catch (error) {
      console.error('Combined export error:', error);
      alert(`Error during combined export: ${error.message}`);
    }
  }
};
