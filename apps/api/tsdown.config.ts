import { defineConfig } from 'tsdown'

// Workspace packages export TypeScript source, so they are bundled in;
// everything from npm stays external and is installed in the image.
export default defineConfig({
  entry: ['src/main.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  deps: { alwaysBundle: [/^@cairnhq\//] },
  copy: [{ from: '../../packages/db/migrations', to: 'dist' }],
})
