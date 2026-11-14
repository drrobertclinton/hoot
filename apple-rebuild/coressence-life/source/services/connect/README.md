# Coressence Connect

The small companion service for Coressence Life (Vilasi, Inc.). It does the parts of a wearable connection that cannot live in a phone app: it holds each vendor's client secret, runs the OAuth sign-in and token exchange, keeps the member's access tokens (encrypted), receives vendor webhooks, and hands the app already-normalized data in the shared schema (`src/schema.ts`, a byte-for-byte copy of the app's `src/modules/devices/schema.ts`; an app test checks the two match).

Not deployed. No keys are in this folder. Apple Health and Health Connect data never comes here; it stays on the phone.

## What it stores

| Item | How long | How |
|---|---|---|
| Install session (hash of the token only) | until deleted | encrypted store |
| Vendor access and refresh tokens, vendor user id | until the member disconnects | AES-256-GCM with `CONNECT_DATA_KEY` |
| OAuth state and PKCE verifier | 10 minutes, single use | encrypted |
| Pushed data (Garmin) and webhook notices | until the phone syncs, at most 7 days | encrypted, deleted on delivery |

Pull vendors (Oura, WHOOP, Google Health, Withings, Polar, Dexcom) are fetched live when the phone syncs and nothing is kept. No analytics, no advertising, nothing sold or shared. `FileStore` (`src/store.ts`) suits one small server; for production put the same interface on Postgres (or similar) with encryption at rest and backups, and run it behind HTTPS.

## Run it

```
npm install
cp .env.example .env        # fill in what you have; leave the rest empty
npm test                    # 5 test groups: encryption, OAuth round trip, Garmin push, webhook signatures, normalizers
npm run typecheck
CONNECT_DATA_KEY=$(openssl rand -base64 32) CONNECT_PUBLIC_URL=https://your-host npm start
```

Node 20 or newer. Any Node host works (Fly.io, Render, Railway, a small VPS). Then set `CONNECT.serviceUrl` in the app's `src/core/appConfig.ts` to the service's https address. Each brand opens on the app's Connected devices screen as soon as that vendor's ID and secret are set and `<VENDOR>_LIVE=true`; until then the app says it is waiting for that company's approval.

## API

| Method and path | Purpose |
|---|---|
| `POST /v1/session` | new install session; returns the bearer token the app keeps |
| `GET /v1/vendors` | which vendors are configured and live |
| `POST /v1/connect/:vendor/start` | sign-in link (state, plus PKCE for Garmin and Google) |
| `GET /v1/oauth/:vendor/callback` | vendor redirect target; exchanges the code, stores tokens, returns to `coressence://devices?connected=<vendor>&ok=1` |
| `GET /v1/connections` | this install's connections |
| `DELETE /v1/connections/:vendor` | revokes at the vendor where it allows it, deletes tokens and queued data |
| `GET /v1/sync?days=90&tz=America/New_York` | normalized batches; days are the member's local days |
| `GET/POST/HEAD /v1/webhooks/:vendor` | vendor notifications |
| `GET /v1/aggregator/:id/sync` | optional aggregator path |

Redirect URIs to register with each vendor: `https://<your host>/v1/oauth/<vendor>/callback` where vendor is `oura`, `whoop`, `garmin`, `fitbit`, `withings`, `polar` or `dexcom`. Webhook URLs: `https://<your host>/v1/webhooks/<vendor>` (Garmin and Withings add `?key=<their WEBHOOK_TOKEN>`).

## Vendors (checked against each vendor's pages on 2026-10-23)

| Vendor | Sign-in | Data | Webhooks | Approval and cost |
|---|---|---|---|---|
| Oura API v2 | `cloud.ouraring.com/oauth/authorize`, token `api.ouraring.com/oauth/token` | sleep periods with 5-minute stages, readiness and temperature deviation, activity, SpO2, workouts | GET challenge with `verification_token`; `x-oura-signature` HMAC-SHA256 over `x-oura-timestamp` + body | about 10 users until Oura approves; Gen3 and Ring 4 users need Oura Membership. Register at developer.ouraring.com |
| WHOOP API v2 | `api.prod.whoop.com/oauth/oauth2/auth` and `/token`, `offline` scope for refresh | recovery, cycles (strain), sleep stages, workouts with zones | `X-WHOOP-Signature` base64 HMAC-SHA256 of `X-WHOOP-Signature-Timestamp` + body | Sandbox 10 members, then Build 100, Growth 1,000, Scale 5,000, Production by review |
| Garmin Connect Developer Program | OAuth 2.0 PKCE: `connect.garmin.com/oauth2Confirm`, token `connectapi.garmin.com/di-oauth2-service/oauth/token` | Health and Activity API summaries pushed to the webhook | push (Starter); secret key in URL | business application and approval; Starter is push only, no history, limited users; commercial license fee |
| Google Health API (Fitbit, Pixel Watch) | Google OAuth with PKCE, `googlehealth.*.readonly` scopes | steps, sleep stages, daily resting heart rate, daily HRV (mapped so far) | not used yet | all scopes are restricted: Google privacy and security review. Legacy Fitbit Web API is turned off this autumn (Google gives Oct 30 and Nov 2, 2026 on different pages) |
| Withings Public API | `account.withings.com/oauth2_user/authorize2`, token `wbsapi.withings.net/v2/oauth2` (`action=requesttoken`) | weight, fat ratio, fat-free mass, blood pressure and pulse, sleep summary | `notify` subscribe (appli 1, 4, 44); not signed, so key in URL | free plan 10 users until app review; Withings+ needed on the free plan for accounts created after Oct 12, 2026 |
| Polar AccessLink v3 | `flow.polar.com/oauth2/authorization`, token `polarremote.com/v2/oauth2/token`; then `POST /v3/users` | exercises, sleep, Nightly Recharge | one webhook; `Polar-Webhook-Signature` HMAC-SHA256 | free; client created by any Polar Flow user at admin.polaraccesslink.com |
| Dexcom API v3 | `/v2/oauth2/login` and `/token`, scope `offline_access` | estimated glucose values (EGVs), 1-hour delay in the US | none | sandbox free; limited production 5 users; full access by partner review and data license |

Field mappings follow each vendor's published reference. Garmin's full Health API specification is only shared after approval, and the Google Health API is new, so confirm `fromGarmin()` and `fromGoogle()` against those documents before going live; each normalizer is a pure function with a test, so changes are quick to check. Google types still to add once verification starts: weight, body fat, oxygen saturation, exercise, ECG and irregular rhythm notifications.

Samsung Galaxy Watch and Ring data reaches the app through Health Connect. Samsung's own Health Data SDK is an on-phone Android SDK (not a cloud API), so it would be added to the app, not this service, after Samsung partner approval.

## Aggregator path (optional, off by default)

Set `AGGREGATOR` to `terra`, `junction` or `rook` with its API key to pull through one aggregator instead of the direct connections. The app treats aggregator data as a copy, so a brand that is also connected directly keeps its direct data. `src/vendors/aggregators.ts` has the Terra mapping as a start; Junction and ROOK endpoints get added after signing up. Published pricing (2026-10-23):

| | Price | What it covers |
|---|---|---|
| Terra | Quick Start from $499 a month monthly, $399 a month annually; 100,000 credits included; each connected user is 200 credits a month | most wearables, widget sign-in, webhooks, mobile SDK for Apple Health and Health Connect ([tryterra.co/pricing](https://tryterra.co/pricing)) |
| Junction (formerly Vital) | Launch $300 a month for 1 to 500 connected users; Enterprise custom | 300+ device integrations, lab testing on Enterprise ([junction.com/pricing](https://www.junction.com/pricing)) |
| ROOK | Core $399 a month up to 750 active users; Core+ $999 up to 5,000; Business $1,999 up to 15,000 | wearables API, health scores, mobile SDK ([tryrook.io/pricing](https://www.tryrook.io/pricing)) |

At Coressence's size the direct connections cost nothing beyond Garmin's license fee and hosting, but each needs its own approval. An aggregator removes most of that paperwork for a monthly fee, and Garmin and Dexcom may still require their own agreements through it.

## Sources

- Oura: https://cloud.ouraring.com/v2/docs, https://api.ouraring.com/v2/static/json/openapi-1.37.json, https://partnersupport.ouraring.com/hc/en-us/articles/20949682312211-The-Oura-API
- WHOOP: https://developer.whoop.com/api, https://developer.whoop.com/docs/developing/oauth, https://developer.whoop.com/docs/developing/webhooks, https://developer.whoop.com/docs/developing/app-approval
- Garmin: https://developer.garmin.com/gc-developer-program/overview/, https://developer.garmin.com/gc-developer-program/health-api/, https://developerportal.garmin.com/sites/default/files/OAuth2PKCE.pdf
- Google Health API: https://developers.google.com/health/about, https://developers.google.com/health/scopes, https://developers.google.com/health/data-types, https://developers.google.com/health/reference/rest, https://dev.fitbit.com/build/reference/web-api/
- Withings: https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/public-health-data-api-overview/, https://static.withings.com/content/api/plans/plans.html
- Polar: https://www.polar.com/accesslink-api/
- Dexcom: https://developer.dexcom.com/docs/, https://developer.dexcom.com/docs/dexcomv3/endpoint-overview
- Samsung: https://developer.samsung.com/health/data/overview.html, https://developer.samsung.com/health/data/process.html
