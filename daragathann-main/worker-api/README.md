# Daragat Worker API

Standalone Cloudflare Worker REST + Offline-First Delta Sync API for the **Daragat** gradebook D1 database (`daragat`, ID `6383cedf-faa1-4cff-b8fc-1dec9a3c79f5`).

## Assumptions
1. Because the request text ended at `THE FULL SPECIFICATION FOLLOWS:`, the backend specification was derived directly from the authoritative Daragat codebase (`/database/schema_sqlite.sql`, `/functions/_lib/auth.ts`, `/functions/api/users.ts`, `/functions/api/data.ts`, and `/src/types/index.ts`).
2. **Authentication**: Clients (Flutter mobile/desktop or Web) authenticate via Firebase Auth and send `Authorization: Bearer <Firebase ID Token>` on all protected routes. Tokens are verified using Google's RS256 JWKS against Firebase project `gen-lang-client-0369327125`.
3. **Database & Compatibility**: The Worker binds to the existing D1 database `daragat`. Migration `0001_initial_schema.sql` uses `CREATE TABLE IF NOT EXISTS` matching the existing schema; `0002_sync_metadata.sql` adds `version`, `updated_at`, and `sync_tombstones` for delta sync; `0003_triggers.sql` adds automatic versioning, `used_trials` preservation before user deletion, and delete tombstones.
4. **Subscription Rules (Server-Authoritative)**:
   - New users receive an exact **72-hour trial** calculated on the server (`expires_at = created_at + 72h`) and recorded permanently in `used_trials`.
   - Self-deletion (`DELETE /api/v1/users/me` or `DELETE /api/v1/data`) removes user data while preserving `used_trials` so re-registration does not grant a second trial.
   - Admin subscription activation (`PUT /api/v1/users/:uid`) computes expiration on the server (`+30d` monthly, `+365d` yearly, `NULL` lifetime) and clears `cancelled_accounts`.
   - Expired or cancelled accounts receive HTTP `403` (`SUBSCRIPTION_EXPIRED` / `ACCOUNT_CANCELLED`) across all gradebook and sync endpoints.
5. **Sync Strategy**: Offline-first delta sync uses `/api/v1/sync` (`GET ?since=<ISO>` and `POST` with upserts + deletes + tombstones), while `/api/v1/data` preserves full-snapshot compatibility with the existing Web client format.

## API Endpoints
Base path: `/api/v1`

- `GET /api/v1/health` — Public health and D1 connectivity check
- `POST /api/v1/users` — Register or refresh authenticated user (returns server-authoritative trial/subscription)
- `GET /api/v1/users/me` — Get current user profile & subscription state
- `PATCH /api/v1/users/me/role` — Update `userRole` / `institutionType`
- `DELETE /api/v1/users/me` — Self-delete account and gradebook data (preserves `used_trials`)
- `GET /api/v1/users` *(Admin)* — List all users
- `GET /api/v1/users/:uid` *(Admin)* — Get user by UID
- `PUT /api/v1/users/:uid` *(Admin)* — Activate/update subscription or cancel user
- `DELETE /api/v1/users/:uid` *(Admin or Self)* — Delete user and gradebook data
- `GET / PUT /api/v1/profile` — Teacher profile
- `GET / POST /api/v1/models`, `GET / PUT / PATCH / DELETE /api/v1/models/:id`, `PUT /api/v1/models/:id/columns` — Monthly gradebook models & custom columns
- `GET / POST /api/v1/students`, `POST /api/v1/students/bulk`, `GET / PUT / PATCH / DELETE /api/v1/students/:id` — Students CRUD & bulk upsert
- `GET / PUT /api/v1/records`, `POST /api/v1/records/bulk`, `DELETE /api/v1/records/:studentId/:modelId` — Student scores, participation & attendance records
- `GET / POST /api/v1/terms`, `GET / PUT / PATCH / DELETE /api/v1/terms/:id` — Academic terms CRUD
- `GET / POST /api/v1/sync` — Delta sync pull (`?since=&includeDeleted=`) and push
- `GET / POST / DELETE /api/v1/data` — Legacy full-snapshot parity endpoints

## Local Development & Testing
```bash
cd worker-api
npm install
npm run typecheck
npm test
npm run db:migrate:local
npm run dev
```

## Production Deployment (Run Manually)
> Note: `0002_sync_metadata.sql` adds new columns (`version`, `updated_at`) and tables to D1. Always inspect migration status before applying to production.

```bash
cd worker-api
npx wrangler d1 migrations list daragat --remote
npx wrangler d1 migrations apply daragat --remote
npx wrangler deploy
```
