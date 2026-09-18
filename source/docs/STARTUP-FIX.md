# Automatic opening fix

The production build embeds its one compiled module and stylesheet into index.html. Artwork CSS paths are rebased to the HTML root. The visible Skip to game anchor is removed; initial HTML shows a styled opening status and the first render replaces it automatically. A timeout/early-error controller offers Reload only when startup fails. Source build commands now run scripts/inline-entry.mjs before generating the service worker.

96 local tests pass, including three opening-controller checks. Build, inline JavaScript syntax and artifact paths pass. Live GitHub and browser/phone checks remain unrun. This fixes the fragile upload/startup behavior locally; the exact cause of the previously reported live symptom was not confirmed remotely.
