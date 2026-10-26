import { defineConfig } from 'tsdown'

/**
 * This package ships two entries: the library and the `dsh-next-step-mcp` stdio
 * server referenced by package.json `bin`. The root tsdown builds only
 * `lib/types/index.js`, so this override adds `lib/types/bin.js`. Each entry
 * builds separately so neither depends on a hashed shared chunk, which a
 * published `files` list cannot name. Declarations come from `tsc -b`
 * (dts: false), matching every package.
 */
export default defineConfig([
  {
    entry: ['lib/types/index.js'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  {
    entry: ['lib/types/bin.js'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
])
