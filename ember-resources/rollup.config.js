// @ts-nocheck
import babel from '@rollup/plugin-babel';
import { defineConfig } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';

import { Addon } from '@embroider/addon-dev/rollup';

const addon = new Addon();

const extensions = ['.js', '.ts', '.hbs'];

const transpilation = [
  // Instruct rollup how to resolve ts and hbs imports
  // (importing a template-only component, for example)
  nodeResolve({ resolveOnly: ['./'], extensions }),

  // This babel config should *not* apply presets or compile away ES modules.
  // It exists only to provide development niceties for you, like automatic
  // template colocation.
  // See `babel.config.json` for the actual Babel configuration!
  babel({ babelHelpers: 'bundled', extensions }),

  // Follow the V2 Addon rules about dependencies. Your code can import from
  // `dependencies` and `peerDependencies` as well as standard Ember-provided
  // package names.
  addon.dependencies(),

  // Ensure that standalone .hbs files are properly integrated as Javascript.
  // addon.hbs(),

  // addons are allowed to contain imports of .css files, which we want rollup
  // to leave alone and keep in the published output.
  // addon.keepAssets(['**/*.css']),
];

// these should be JS, even though the authored format is TS
// Unfortunately, your local project layout has to kind of match what classic ember expects
// so that all the app-re-exports can be properly generated
// const globallyAvailable = ['components/**/*.js', 'instance-initializers/*.js', 'helpers/**/*.js'];

export default defineConfig({
  input: ['src/index.ts'],
  output: {
    sourcemap: true,
    format: 'es',
    dir: 'dist',
  },
  plugins: [
    ...transpilation,
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints(['index.js']),

    // These are the modules that should get reexported into the traditional
    // "app" tree. Things in here should also be in publicEntrypoints above, but
    // not everything in publicEntrypoints necessarily needs to go here.
    // addon.appReexports([]),

    addon.clean(),
  ],
});
