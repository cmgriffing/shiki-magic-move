import fs from 'node:fs/promises'
import { defineBuildConfig } from 'unbuild'
import babel from '@rollup/plugin-babel'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/vue',
    'src/react',
    'src/core',
    'src/types',
    'src/solid',
    'src/renderer',
    {
      builder: 'mkdist',
      outDir: 'dist',
      input: './src',
      pattern: ['**/*.css'],
    },
    {
      builder: 'mkdist',
      input: 'src/svelte',
      outDir: 'dist/svelte',
      format: 'esm',
      pattern: ['**/*'],
    },
  ],
  declaration: true,
  clean: true,
  rollup: {
    inlineDependencies: true,
    // Disable esbuild in favor of Babel for SolidJS support
    esbuild: false,
  },
  hooks: {
    'rollup:options': async (config, options) => {
      options.plugins.unshift(babel({ babelHelpers: 'bundled', include: ['src/**'], exclude: ['src/solid/**', 'src/react/**'], presets: ['@babel/preset-typescript'], extensions: ['.ts', '.js'] }))
      options.plugins.unshift(babel({ babelHelpers: 'bundled', include: ['src/solid/**'], presets: ['@babel/preset-typescript', 'solid'], extensions: ['.ts', '.tsx', '.js', '.jsx'] }))
      options.plugins.unshift(babel({ babelHelpers: 'bundled', include: ['src/react/**'], presets: ['@babel/preset-typescript', '@babel/preset-react'], extensions: ['.ts', '.tsx', '.js', '.jsx'] }))
    },
    'mkdist:done': async () => {
      await fs.writeFile('dist/svelte.mjs', 'export * from "./svelte/index.mjs"\n', 'utf-8')
      await fs.writeFile('dist/svelte.d.ts', 'export * from "./svelte/index.mjs"\n', 'utf-8')
      await fs.writeFile('dist/svelte.d.mts', 'export * from "./svelte/index.mjs"\n', 'utf-8')
      await fs.copyFile('dist/svelte/index.d.ts', 'dist/svelte/index.d.mts')
    },
  },
})
