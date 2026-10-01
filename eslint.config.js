import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig } from 'eslint/config'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/.nuxt/**',
      '**/.nitro/**',
      'packages/db/migrations/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  vue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    // TypeScript checks undefined names, including Nuxt's auto-imports.
    files: ['**/*.{ts,vue}'],
    rules: { 'no-undef': 'off' },
  },
  {
    files: ['apps/web/app/pages/**/*.vue', 'apps/web/app/app.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
  prettier,
)
