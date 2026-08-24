# Fixture: one module in two assets

This fixture tests one source module that Webpack puts in two output bundles.

## Test case

The build has two entry files:

- `src/long-message-entry.js`
- `src/short-message-entry.js`

Both files import `src/messages.js`. This is the source module that the two bundles share.

`messages.js` exports a long message and a short message. Each entry file imports only one of
these exports. Webpack creates these bundles:

- `long-message.js` contains the long message.
- `short-message.js` contains the short message.

The configuration disables module concatenation, split chunks, and the separate runtime chunk.
These settings keep the module visible in both bundles.

## Stats and bundle sizes

Webpack gives `messages.js` module ID `906`. The stats report its source size as `87` in both
chunks.

Webpack removes the unused export from each bundle. This makes the emitted module factories
different:

- The factory in `long-message.js` has 59 characters.
- The factory in `short-message.js` has 37 characters.

The analyzer must report the correct factory size for each bundle.

## Rebuild

Run this command from the repository root:

```sh
npx webpack --config test/stats/with-module-in-multiple-assets/webpack.config.js
```

The `stats.json` file is a reduced copy of the Webpack stats. It contains only the fields that the
analyzer reads.
