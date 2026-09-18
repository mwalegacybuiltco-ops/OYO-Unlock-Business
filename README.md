# OYO: UNLOCKED — complete package with corrected startup

This ZIP includes everything needed from the current delivery. The ready-built game is at the ROOT: index.html, images, icons, manifest.webmanifest and sw.js. There is no extra website folder to move.

## GitHub upload

Extract the ZIP. Upload the CONTENTS to the root of mwalegacybuiltco-ops/OYO-Unlocked, replacing matching files, while keeping repository history. index.html must be at the repository root. Do not upload only the ZIP or put the contents inside another enclosing folder.

In GitHub Settings → Pages, choose Deploy from a branch → main → / (root). Disable an obsolete custom publishing workflow if it deploys a different build. Wait for Pages to finish, then open your website link. The game starts automatically without a Skip to game link. No player-side command or deployment is needed.

## Included

- Root: corrected ready-built PWA, original new game artwork, icons, offline shell and license notices.
- source/: the full editable game, public Firebase configuration, build tools and tests.
- source/firestore.rules and source/firestore.indexes.json: Firebase security and index configuration.
- source/billing-server/: automatic PayPal server code, tests and private-configuration example.
- FULL-SETUP.md: Firebase, owner account, tester passes, Proof Bank storage/offloading and publishing instructions.
- source/billing-server/SETUP.md: payment server deployment and PayPal sandbox acceptance.
- source/docs/: storage, artwork provenance, test evidence and startup-fix notes.

Firebase configuration for oyo-unlocked is included. No private credentials or server secret files are included. Set those directly in your server host. GitHub Pages does not run the Node PayPal server; uploading its source does not activate payment automation.

96 local tests and the corrected production build passed. Live Firebase rules, PayPal integration, browser layout, mobile installation and phone offloading remain unverified. Nothing was published to your live site in this session. Older ZIPs remain preserved.
