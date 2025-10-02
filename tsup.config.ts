import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  dts: false,
  minify: false,
  shims: true,
  splitting: false,
  target: 'node18',
  external: ['ws'],
  banner: {
    js: '#!/usr/bin/env node'
  }
});
