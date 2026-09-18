# OYO: UNLOCKED — corrected automatic opening

Extract this ZIP. Upload ALL its contents into the root of mwalegacybuiltco-ops/OYO-Unlocked, replacing matching files. index.html belongs at the repository root, not in a new enclosing folder. Upload extracted files, not the ZIP itself.

GitHub Settings → Pages → Deploy from a branch → main → / (root). Wait for the Pages deployment to finish, then open https://mwalegacybuiltco-ops.github.io/OYO-Unlocked/ . Disable an older custom publishing workflow if it replaces these compiled files with a different build.

The page automatically opens the game. There is no Skip to game or start link. All game JavaScript and styling are embedded in index.html; the PNG artwork, icons, manifest and service worker remain alongside it for visuals and installation. No visitor command or local server is needed.

If a tab was open before the update, close it and reopen the link after GitHub reports successful publication. The opening screen reports a startup failure with a Reload game control if it cannot finish, instead of leaving a bare page.

Firebase configuration remains included and unchanged. Your previously required Firebase rules/indexes and separate automatic PayPal server setup still apply. This startup fix does not publish Firebase rules or connect PayPal.

Verification: 96 local tests passed. Production build, compiled inline-script syntax and relative GitHub file paths passed. No live repository or service was changed, and no browser/device acceptance test was run. Previous packages are preserved.
