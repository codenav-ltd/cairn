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
    // Nuxt names these from their route, layout or directory prefix
    // (components/account/Profile.vue is <AccountProfile>, ui's Button is <UiButton>).
    files: [
      'apps/web/app/pages/**/*.vue',
      'apps/web/app/layouts/*.vue',
      'apps/web/app/components/*/*.vue',
      'apps/web/app/app.vue',
      'packages/ui/src/components/*.vue',
    ],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
  {
    // Optional props typed with TypeScript are undefined by default.
    files: ['**/*.vue'],
    rules: { 'vue/require-default-prop': 'off' },
  },
  prettier,
)
