# Automatic PayPal access — owner setup

Status: implementation packaged; no PayPal account connected, no deployed receiver, no real payment verified. Local tests use simulated PayPal/Firebase responses. Do not sell subscriptions against this integration until the checklist below passes.

## Hosting

This is a portable Node.js 22+ HTTP service. Deploy **this billing-server directory** to a separate HTTPS Node host. Build command: `npm install --omit=dev`. Start: `npm start`. The server listens on the host's PORT and exposes GET /health. No local disk database is used. Firebase Admin SDK version is pinned to 13.10.0; resolve and retain the server's dependency lockfile during deployment. No server package installation or network download was performed in this session.

A Render Free Web Service can be used for sandbox evaluation, but Render explicitly advises against its free tier for production: it sleeps after 15 minutes, may take about a minute to wake, and has usage/suspension limits. It is not a promise of reliable free payment processing. Use an appropriate always-available host for paying customers. No hosting account was created or charged here. Official limitations: https://render.com/docs/free .

## Secret settings — server only

Set the names shown in .env.example in your hosting dashboard:

- FIREBASE_PROJECT_ID: oyo-unlocked
- GOOGLE_APPLICATION_CREDENTIALS: path to a private Firebase service-account JSON file mounted by the host (for example /etc/secrets/firebase-service-account.json).
- PAYPAL_MODE: sandbox first; live only after testing.
- PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET: credentials for your PayPal REST app in that environment.
- PAYPAL_PLAN_ID: your active plan under the same merchant/environment.
- PAYPAL_WEBHOOK_ID: the webhook created for the same REST app.
- APP_URL: https://mwalegacybuiltco-ops.github.io/OYO-Unlocked/ (exact deployed HTTPS game URL, no query or fragment).

Obtain the Firebase key through your project settings/service accounts and upload directly to the host's private secret-file mechanism. Do not place it in the website, ZIP, browser environment, repository or chat. Use a dedicated service account with only necessary Firebase Authentication lookup and Firestore data access permissions. The Admin SDK uses server credentials and bypasses client rules; protecting those credentials is essential. Official setup: https://firebase.google.com/docs/admin/setup .

You can reserve the host URL before starting the app, create the PayPal webhook for that URL, then fill the webhook ID and deploy. All required settings must be present before startup succeeds.

## Plan support and connection

Use one ongoing fixed-price regular billing cycle: DAY, WEEK, MONTH or YEAR, interval count 1–12. Amounts must fit a currency value with at most two decimal places. This implementation rejects trials, setup fees, quantity tiers, plan overrides and separate taxes/shipping; these need a separately tested policy. No price, currency or billing frequency has been chosen on your behalf.

The browser calls POST /checkout with a Firebase ID token. The server checks the token, requires a game profile, creates the subscription with the player's UID and stores the binding. Never replace this with a generic hosted checkout URL: that would lose the server-owned player binding.

In the game Owner Admin, enter the server's HTTPS origin (for example https://your-server.example) in Payment server HTTPS address. Only that public URL belongs in the game settings. Never enter a private key there.

## Webhook events

Register https://YOUR-SERVER/webhooks/paypal for these events in your PayPal REST app:

- PAYMENT.SALE.COMPLETED
- PAYMENT.SALE.REFUNDED
- PAYMENT.SALE.REVERSED
- BILLING.SUBSCRIPTION.ACTIVATED
- BILLING.SUBSCRIPTION.UPDATED
- BILLING.SUBSCRIPTION.CANCELLED
- BILLING.SUBSCRIPTION.EXPIRED
- BILLING.SUBSCRIPTION.SUSPENDED
- BILLING.SUBSCRIPTION.PAYMENT.FAILED

The server sends signature verification to PayPal, then fetches current subscription/transaction data. Duplicate events do not extend access. Delayed events for an old subscription cannot replace the current one. Temporary errors return non-success so PayPal can retry. The player's Refresh my access also reconciles with PayPal; there is no continuous paid polling service.

A confirmed payment grants access for at most one configured interval from that payment, capped by the next billing date when available. A cancellation stops renewals but retains already paid time. A failed payment adds no time. Refund/reversal events conservatively hold automatic access for owner investigation; a later completed-event replay cannot silently lift that hold. Partial refunds also hold access. Clear a hold only after investigating the actual payment history and deciding an explicit recovery path. The package does not implement an automatic dispute-resolution system.

Separate tester and earlier manual membership records are never rewritten by the payment server. Existing manual subscribers need an individually reviewed migration; avoid double subscriptions. A checkout whose server response was lost for over an hour stops for owner investigation rather than risking a duplicate charge.

## Sandbox acceptance checklist — all still required

1. Deploy sandbox server, publish the new Firestore rules/indexes and point Owner Admin to it.
2. Register two game accounts. Start checkout as the first; verify its PayPal custom_id and server binding match that UID.
3. Approve and complete an actual sandbox subscription payment. Confirm automatic access and the paid-through date. An approval without a completed payment must not grant access.
4. Verify a subsequent sandbox renewal extends the date once. Replay its webhook and confirm no extra extension.
5. Verify cancellation retains paid time and prevents a new overlapping subscription. Test failed payment, expiry, refund and reversal hold behavior.
6. Reject fake signatures, another player's subscription, wrong plan/currency/amount and browser-forged IDs. Confirm all sparkBilling* documents and sparkPayPalMemberships writes are denied to browser clients.
7. Verify a tester grant/removal does not alter paid access or progress. Test a delayed event from a replaced subscription.
8. Test temporary host/API failures and PayPal retries; inspect failure logs and PayPal webhook delivery status. Configure host failure alerts.
9. Use separate live app/plan/webhook credentials only after those checks pass. Perform your own controlled live acceptance before public launch.

Monitor Firebase and host usage. Billing event/sale audit records accumulate; no paid automatic TTL feature is enabled. Retention/cleanup must preserve transaction links needed for refunds. This package has not been production load tested or formally security audited.

Official references: https://developer.paypal.com/subscriptions/webhooks and https://developer.paypal.com/api/rest/webhooks/rest/ and https://developer.paypal.com/api/subscriptions/v1 .
