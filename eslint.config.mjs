import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    // Apply to all JavaScript files
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        indexedDB: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        DragEvent: 'readonly',
        ClipboardEvent: 'readonly',
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        location: 'readonly',
        history: 'readonly',
        navigator: 'readonly',
        performance: 'readonly',
        crypto: 'readonly',

        // External libraries loaded via CDN
        bootstrap: 'readonly',
        Sortable: 'readonly',
        Quill: 'readonly',
        jspdf: 'readonly',
        jsPDF: 'readonly',
        html2canvas: 'readonly',
        docx: 'readonly',

        // App globals (defined in site.js or data files)
        DM_TOOLBOX_BUILD: 'readonly',
        LevelUpData: 'readonly',
        SPELLS_DATA: 'readonly',
        RULES_DATA: 'readonly',

        // Cross-file globals (loaded via HTML script tags)
        IndexedDBStorage: 'readonly',
        CharacterCreationWizard: 'readonly',
        LevelUpSystem: 'readonly',
        JournalExport: 'readonly',
        showToast: 'readonly',
        showUserError: 'readonly',

        // DOM API constants
        Node: 'readonly',
      },
    },
    rules: {
      // ===== Error Prevention =====
      // Note: Many "unused" vars are intentionally exposed via window.* pattern
      // Set to warn so existing code doesn't block commits
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none'
      }],
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unreachable': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],

      // ===== Best Practices =====
      'no-var': 'error',
      'prefer-const': ['warn', { destructuring: 'all' }],  // Warn for now, many existing issues
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-implicit-globals': 'error',

      // ===== Relaxed Rules (match existing code) =====
      'no-prototype-builtins': 'off',
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',
      'no-async-promise-executor': 'off',  // Used intentionally in IndexedDB code

      // ===== Stylistic (info only, not errors) =====
      'no-console': 'off',  // Console logging is allowed
    },
  },
  {
    // Specific rules for pure modules (stricter)
    files: ['js/modules/**/*.js'],
    rules: {
      'no-restricted-globals': ['error', {
        name: 'document',
        message: 'Modules should not access DOM directly. Use dependency injection.'
      }, {
        name: 'window',
        message: 'Modules should not access window directly. Use dependency injection.'
      }],
    },
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '*.min.js',
      'tests/**',  // Tests have their own config via Vitest
    ],
  },
];
