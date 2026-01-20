# Journal Documentation

**Rich text editor with persistent storage for campaign notes, session logs, and world-building**

## Features

- **Rich Text Formatting** powered by Quill editor
  - Headers (H1, H2, H3), bold, italic, underline, strikethrough
  - Numbered and bulleted lists
  - Text and background colors
  - Text alignment options
  - Insert links with custom display text (hide long URLs)
  - Insert images from local files

- **Image Management**
  - Drag-to-resize images with 8 visual handles (corners and edges)
  - Text wrapping: float left or float right for book-like layouts
  - Images flow naturally with text
  - Alignment toolbar appears on image selection

- **File Management**
  - Sidebar showing all saved journal entries
  - Default file names use timestamp (e.g., "12/22/2025 02:30 PM")
  - Custom file names supported
  - Sort by newest first
  - Click to load any entry
  - Search entries by name or content with highlighting

- **Import System**
  - **Upload Button** - Yellow import button in sidebar for previously exported files
  - **Supported Formats:**
    - **TXT:** Plain text converted to HTML with proper line breaks and paragraphs
    - **Markdown (.md):** Full markdown parsing with headers, bold, italic, links, code blocks, lists
  - **Auto-Processing:**
    - Automatic file type detection and conversion
    - Entry named from filename (extension removed)
    - Imported entry immediately loaded in editor
    - Toast notification confirms successful import
  - **Future Support:** DOCX and PDF import planned (currently shows helpful warning)

- **Export System**
  - **Single Entry Export** - "Export" button with 4 format options:
    - **Word (.docx):** Formatted document with headings and text structure
    - **PDF:** Professional PDF with title and formatted content
    - **Markdown (.md):** Converts HTML to Markdown syntax (headers, bold, italic, links, lists, images)
    - **TXT:** Plain text with clean formatting and title underlines
  - **Bulk Export** - Blue download icon in sidebar opens bulk selection modal:
    - Search and filter entries (same search as main sidebar)
    - Select multiple entries with checkboxes
    - "Select All" / "Deselect All" buttons
    - Selection counter ("N selected")
    - Choose export format (TXT, Markdown, Word, PDF)
    - Export options: Single combined file OR separate files (one per entry)
  - **Format Conversion:**
    - Preserves formatting: headers, bold, italic, strikethrough, lists, links
    - Separate export module (`journal-export.js`) avoids Quill conflicts
    - Libraries: jsPDF for PDF, docx.js for Word documents
  - **Download Handling:**
    - Automatic 300ms delay between downloads prevents browser blocking
    - Success notifications with entry count
    - Sanitized filenames for cross-platform compatibility

- **Persistent Storage**
  - IndexedDB storage - all data saved in browser
  - Entries persist across sessions
  - Auto-save with Ctrl+S (Cmd+S on Mac)
  - Save/Delete with confirmation dialogs
  - Toast notifications for save/delete actions

- **User Interface**
  - Toolbar tooltips describe each formatting option
  - Active file highlighted in sidebar
  - Dark theme matching DM Toolbox aesthetic
  - Responsive layout with file list and editor side-by-side

## Use Case

Keep session notes with embedded maps and NPC portraits. Document world-building details with formatted text and images that flow naturally like in a book. Export individual entries or bulk-export all session notes to Word/PDF/Markdown/TXT for offline sharing. Import previously exported notes to restore or transfer between devices. Search for specific entries by keyword, select multiple, and export as a combined campaign journal. All data stays in your browser with no accounts or cloud sync required.
