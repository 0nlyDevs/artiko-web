# Artiko web

Next.js app for exploring Artiko: artists' 3D museums and the monthly vote, the Hall of Fame, the Living Heritage Index and "Check a photo". It also runs sign-in (Better Auth) for the web and Android apps.

The API contract is `../artiko-api/openapi.yml`; its types are generated into `src/lib/api-types` (committed).

## Setup

1. Copy `.env.example` to `.env.local`: the same Neon `DATABASE_URL` as artiko-api, a random `BETTER_AUTH_SECRET`, and the API address.
2. Create the Better Auth tables (schema `better_auth`, created by the API's first migration), then run:

```
pnpm install
pnpm auth:migrate
pnpm dev
```

After the contract changes in artiko-api: `pnpm gen:api`.

On a slow network, Node gives up on each database address after 250 ms and sign-in fails with `ETIMEDOUT`. Give it longer:

```
NODE_OPTIONS=--network-family-autoselection-attempt-timeout=5000 pnpm dev
```

## Sign-in

- Web: email and password; `authClient.token()` gives the 15-minute JWT that the API checks against `/api/auth/jwks`.
- Android: `POST /api/auth/sign-in/email` returns the session token in the `set-auth-token` header; `GET /api/auth/token` with `Authorization: Bearer <session token>` returns the JWT for the API.

## Pages

| Route | What it does |
|---|---|
| `/` | This month's leading works, endangered practices |
| `/explore` | Works by category, artists |
| `/artists/[id]` | The artist's 3D museum (simple gallery view for slow devices), vote panel |
| `/hall-of-fame` | Top 5 per category and month |
| `/heritage` | Living Heritage Index |
| `/scan` | Check a photo |
| `/sign-in`, `/sign-up`, `/me` | Account, artist profile, publishing a work with proof |
