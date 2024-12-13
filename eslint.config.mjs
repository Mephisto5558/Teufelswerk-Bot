import config from '@mephisto5558/eslint-config';

/**
 * @type { import('eslint').Linter.Config[] }
 * This config lists all rules from every plugin it uses. */
export default [
  ...config,
  {
    name: 'templates',
    files: ['Templates/*.{js,ts}'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  {
    name: 'overwrite',
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      globals: {
        // promisified setTimeout
        sleep: 'readonly',
        // see #Utils/prototypeRegisterer/index.js
        log: 'readonly',
        getEmoji: 'readonly',
        SlashCommand: 'readonly',
        PrefixCommand: 'readonly',
        MixedCommand: 'readonly',
        CommandOption: 'readonly',
        // [TYPES] see globals.d.ts
        GenericFunction: 'writable',
        Snowflake: 'writable',
        Database: 'writable',
        lang: 'writable',
        langUNF: 'writable',
        bBoundFunction: 'writable',
        Client: 'writable',
        Message: 'writable',
        PartialMessage: 'writable',
        Interaction: 'writable',
        GuildInteraction: 'writable',
        DMInteraction: 'writable'
      }
    },
    rules: {
      "sonarjs/no-implicit-dependencies": "off" // Does not support package.json "imports" field
    }
  }
];