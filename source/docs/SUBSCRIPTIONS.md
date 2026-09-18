# Subscription status

New requirement: automatic activation and renewals through PayPal. The included billing-server implements server verification, player binding, webhook processing and reconciliation. It is not deployed or connected. See ../billing-server/SETUP.md for supported plans and the mandatory sandbox checks.

The earlier edition used owner-reviewed payments; those older files are preserved. Their existing membership records remain readable and valid until expiry but are not silently converted into automatic subscriptions. The new UI does not offer manual payment-reference submission as the intended signup flow.

Tester access remains independent. Static game assets are public; entitlements protect cloud progression operations, not secrecy of downloaded artwork or lessons.
