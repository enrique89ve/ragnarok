# Admin Dual Signature Gate Prototype

Question: should admin panel login and private server admin operations require
both a Keychain Active approval from `VITE_RAGNAROK_ADMIN_ACCOUNT` and a server
operator co-sign from `VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT`?

Current working answer:

- `VITE_RAGNAROK_ADMIN_ACCOUNT` is the only wallet account allowed to open the
  panel.
- `VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT` is a public account name. Its private
  active key stays server-side and co-signs login grants plus admin operations.
- Login stays private to the server: the server issues an operator-signed session
  grant only after the admin Keychain signature validates.
- Admin operations are broadcast only after the admin approval and server
  operator signature both exist.
- `VITE_RAGNAROK_TREASURY_ACCOUNT` is payments-only and does not grant panel or
  operator authority.

Delete this directory after the dual-signature login/operation contract is
absorbed into the production admin route and protocol docs.
