const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: process.cwd(),
});

module.exports = [
  // Ignore generated/build folders AND the ESLint config itself
  {
    ignores: [
      'eslint.config.js',
      'node_modules/**',
      'dist/**',
      'build/**',
      '.expo/**',
    ],
  },

  // Convert legacy "extends" configs into flat config
  ...compat.extends('expo', 'prettier'),
];

