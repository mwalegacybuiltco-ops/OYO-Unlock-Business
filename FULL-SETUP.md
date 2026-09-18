# OYO: UNLOCKED — The Unwritten Reach

This is a new standalone package, not a deployed update. Older deliveries remain unchanged.

## What is in this edition

- A new purple/gold sky realm, new character artwork, nine named islands, six evolving Guides, 18 missions, 27 boss rounds, UNLOCKED rewards and saved progression.
- Firebase email accounts, private progress, community and owner proof review.
- Owner tester passes: optional expiry, removal without deleting progress or separate paid access.
- A private Proof Bank for compressed screenshots, templates, notes and saved Guide conversations. Download the bank as a ZIP, confirm it is saved on the phone, then free those game-storage slots.
- A separate PayPal verification server for automatic activation and renewals. It is packaged and locally tested with simulated services; it is NOT connected to your PayPal account or deployed.
- No external course, affiliate storefront, referral editor or OpenAI runtime connection. Prior reference-directed art is preserved outside this new package.

## What remains unverified

Real Firebase signup, database rules in the emulator, PayPal sandbox/live payments, actual device installation, browser layout and phone download/deletion have NOT been verified in this session. The artwork was visually inspected; screen templates were exercised in a lightweight test harness. A successful build does not establish a successful live service.

## 1. Firebase setup — stay on Spark

Use the existing **oyo-unlocked** project. Enable Authentication → Email/Password. Add **mwalegacybuiltco-ops.github.io** to Authorized domains. Create Standard Firestore in production mode if it does not already exist.

Publish **source/firestore.rules**. Also apply **source/firestore.indexes.json**, which disables indexing the large Proof Bank image/text fields. With Firebase CLI installed and authenticated, run from source:

```
firebase deploy --project oyo-unlocked --only firestore:rules,firestore:indexes
```

This command is an instruction for your setup, not a deployment already performed. No Cloud Functions, Cloud Storage or Blaze upgrade is needed for this Firebase client. The payment server is hosted separately.

The Proof Bank uses new **sparkPlayers/UID/bank** documents and **sparkBankCapacity/global**. The first legitimate bank save initializes the capacity counter. Do not reset this counter while items exist; it protects the shared allowance. Do not import old bank documents without rebuilding the counter with administrator tooling.

## 2. Publish the website

Upload only the **ready-built website files at the root of this complete package** to the root of **mwalegacybuiltco-ops/OYO-Unlocked**, with index.html at the top level. Use GitHub Pages → Deploy from a branch → main → / (root). Preserve your repository history. Disable an obsolete publishing workflow if it publishes a different source tree. Never upload server secrets.

Expected site address: https://mwalegacybuiltco-ops.github.io/OYO-Unlocked/ . It was not inspected or changed in this session. A full HTTPS deployment is needed for installation and service-worker checks.

The editable application lives in **source/**. Node.js 22+ and pnpm 11.19.0: install from the included lockfile, run `pnpm test`, then `pnpm build:pages`. The fresh build goes to source/dist. Source/scripts/preview.mjs serves that dist directory. A local preview was not run here.

## 3. Register the owner

Create your own game account. Copy its UID from Firebase Authentication → Users. In Firestore create **sparkConfig/owner** with a string field **uid** containing that exact UID. Sign out and back in. This is a Firebase Console operation; a player cannot appoint themselves owner.

## 4. Connect automatic PayPal

Read **source/billing-server/SETUP.md**. Deploy that small Node server to a host you control, configure its private credentials there, and complete the sandbox checklist before using live credentials. Firebase remains Spark. Server hosting is a separate account/usage decision.

In Owner Admin → Automatic PayPal subscriptions, enter the deployed server's HTTPS origin. Do NOT paste a hosted PayPal plan link there. Set your button label and save. Pricing and interval come from the PayPal plan configured on the server. The game remains honest about checkout being unavailable until an API address is supplied; an address alone is not proof that setup works.

New subscriptions are bound to the authenticated player's UID by the server. The server verifies PayPal signatures and reads the subscription and completed transaction before granting access. A return URL, activation event without a payment, screenshot or user-supplied reference grants nothing.

Older manual membership grants remain valid through their recorded expiry. They are not automatically linked or migrated to PayPal subscriptions; do not ask existing subscribers to create a second subscription without reviewing their old one.

## 5. Tester access

The tester creates an account and opens the game first. They copy **Player ID** from Membership and send it to you. Owner Admin → Tester access: enter the ID, optional expiry in your local time, and an access note; grant the pass. Blank expiry means until removed. Use Manage tester then Remove tester access to revoke. Notes on that record are readable by that player; they are not confidential owner notes.

Testers still complete the normal mission and boss gates. A tester pass does not cancel a recurring PayPal payment. Removing tester access keeps any separately paid access and all progress. The player uses Refresh my access or signs back in after a grant/removal. Server rules enforce expiry even if a badge is temporarily stale.

## 6. Proof Bank storage and offloading

Each player has 12 screenshot slots and 24 journal slots. Screenshots become JPEGs at up to 1,600 pixels and 180,000 bytes each. Notes/templates/conversations hold up to 12,000 characters. Text and screenshots are private to that account, including from owner-client access.

There is also a **shared cap of 400 bank items for the entire game**. Every item reserves a conservative 256 KiB allowance (about 100 MiB in total), even if it is smaller. Firestore rules require atomic counter updates on save and removal. This budget is deliberately below Firestore's 1 GiB free storage allowance. Other collections, index overhead and service usage also count toward Firebase quotas: this is a bank budget, not a live measurement or guarantee for the entire project.

When their slots or the shared allowance are full, players see a full message. Save original to phone/device and Save to phone/device remain available without a cloud write. For existing items: **Download my Proof Bank → open and check ZIP in Files/Downloads → I saved the ZIP — free my game storage**. Only unchanged backed-up items are removed. Submitted mission evidence, XP, progress and subscriptions are untouched. If an item changed on another device after the download, offloading stops and requests a fresh backup. Downloading alone does not delete anything.

Firebase quota errors also show a clear failure message rather than claiming a save succeeded. No paid upgrade or automatic billing is configured. If the project itself exhausts its free read/write allowance, even cleanup can require waiting for that allowance to reset. Keep a backup before the account approaches its project-wide limit. See docs/STORAGE.md.

## Before inviting paying customers

Run the Firestore emulator suite; complete the PayPal sandbox checklist; test two separate accounts for privacy, owner/tester privileges and progress; inspect desktop/mobile layouts; install the PWA on a real phone; verify bank ZIP download, extraction and offload. Do not treat the local test count as live certification.

Content expands through the nine existing worlds and branching Guide levels. This package does not generate unlimited new worlds. Existing Spark progress IDs are preserved. Data from older pre-Spark collections is not automatically migrated.
