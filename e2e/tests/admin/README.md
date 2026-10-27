# Admin create/edit suite

Drives every admin create/edit form through the real UI against the real
backend, then reads the result back through the API (with the admin's own
session) to check each field was persisted.

Run (dev servers must already be up — `e2e/.env` points at them):

    npm run test:admin

- Files run **serially, in order, one worker**: later groups use what earlier
  ones created (`.admin-state/<group>.json`, gitignored). Run the whole chain;
  a single file only works right after the files before it.
- Everything created is named/keyed with an `E2E-TEST` prefix plus a per-run
  token. Deletion is a separate, later phase.
- Real singleton content (terms/privacy/shipping, company info, email
  templates, homepage sections, settings, order-status order) is edited,
  verified, then restored.
- One full run uploads ~30 images; the backend's upload limiter allows 30 per
  10 minutes per IP, so start from a freshly (re)started backend.
- `08-linking` covers bulk tag assignment (checked in the storefront's
  buy-together), hero slides made from promo codes / discount events, and
  linking walk-in customers to real accounts (manual + phone-claim flow).
- Non-blocking discrepancies don't fail the chain: they're printed as
  `FINDING:` and appended to `.admin-state/findings.jsonl`.
