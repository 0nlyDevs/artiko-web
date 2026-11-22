# Artiko Web

Next.js web app for Artiko: the home gallery, explore, artist museums, the Hall of Fame, the heritage index, photo checks and each artist's space. It signs users in with Better Auth and talks to [artiko-api](https://github.com/0nlyDevs/artiko-api). SOLUTION-6 names Keycloak for identity; the team chose Better Auth instead, and the API only needs a different JWKS URL, issuer and audience to switch.

## Develop

Prerequisite: [mise](https://mise.jdx.dev/getting-started.html). It installs the exact Node, pnpm, Task and gitleaks versions pinned in `mise.toml`; run every command below from the mise environment (`mise activate` in your shell, or prefix with `mise exec --`).

```
mise install          # Node, pnpm, Task, gitleaks at the mise.toml versions
task --list           # every task with its description
task build            # pnpm install --frozen-lockfile (skipped while the lockfile is unchanged), then next build
task dev              # http://localhost:3000
task ci               # install, audit, lint, typecheck, test, build: the same steps as CI, stops at the first failure
task hooks:install    # once per clone: gitleaks pre-commit hook via core.hooksPath=.githooks
task test:e2e         # real-browser journeys in e2e/ (not in ci): rebuilds .next against a mock API, needs Chrome at CHROME_PATH (default /usr/bin/google-chrome-stable), skipped without it
```

Tasks that need Node first run `task check:versions`, which fails when Node or pnpm differs from `mise.toml` or when `mise.toml` and `packageManager` in `package.json` disagree. The pre-commit hook refuses a commit whose staged changes contain a secret; the `gitleaks` CI job scans the commits of every pull request and push too, so a commit made with `--no-verify` is still caught.

## Auth and API

- Copy `.env.example` to `.env.local` and fill it in. Use the same database as artiko-api (Better Auth keeps its tables in schema `better_auth`), then run `pnpm auth:migrate` once.
- Better Auth signs a JWT (EdDSA, issuer and audience = `BETTER_AUTH_URL`) published at `/api/auth/jwks`. artiko-api verifies it. Web: `authClient.token()`. Android: sign in, read the `set-auth-token` header, then `GET /api/auth/token` with it as a bearer token.
- Sign-in and sign-up are rate limited per client IP, with counters in the database (`rateLimit` table: rerun `pnpm auth:migrate` after upgrading). `AUTH_CLIENT_IP_HEADER` is required in production and must be a header your host's proxy overwrites with the real IP (not `x-forwarded-for`, which clients can set); the server refuses to start otherwise.
- Accounts must confirm their email before they can sign in (no session, so no API token, until the link is opened); artiko-api also refuses any token whose `emailVerified` claim is not true. Verification and password-reset links last one hour, a reset closes every open session, and passwords found in known breaches (Have I Been Pwned, k-anonymity) are refused. The emails go through Resend: `RESEND_API_KEY` and `EMAIL_FROM` are required in production. Without the key, sending fails, except in development where the email is printed to the server log. Android: sign-up answers without a token, the person opens the emailed link, then signs in as before.
- `BETTER_AUTH_SECRET` has no fallback: the auth route fails on its first request without it, but `next build` needs none.
- `src/lib/api.ts` is the only entry point to the API. Its client is generated from `artiko-api/openapi.yml`: run `pnpm api:generate` (set `OPENAPI_SPEC` to another path or URL) and commit the result.

## Layout

- `src/app/`: routing only. `(app)` is the root layout; inside it `(pages)` wraps the app pages in the navigation (`features/site/app-shell.tsx`) and `(auth)` puts sign-in, sign-up and password reset beside a video (`public/auth/`, credits in `CREDITS.md`).
- `src/features/<feature>/`: the code behind a route.
- `src/components/`: the 3D gallery walk of the home page (`gallery/`), still to be moved under `src/features/gallery/` to follow the same rule.
- `src/lib/`: `auth.ts` and `auth-client.ts` (Better Auth), `email.ts` (account emails), `api.ts` and `api-client/` (generated, do not edit), `ui/` (sliding chips and tabs, icons, avatars), `works/` (work tile, vote).
- `public/gallery/`: the home gallery's pictures, landscape and Satie files, credited in `sources.json`.
- Motion (sliding pills, skeletons, staggered entrances, the vote heart) lives in `globals.css` and stops under `prefers-reduced-motion`.
- `public/draco/` and `public/draco3d/`: Draco codecs copied from `three` and `draco3d` by `scripts/copy-draco.mjs` before `pnpm dev` and `pnpm build` (not committed), so no visitor or artist fetches them from www.gstatic.com.

Rule: a page file only imports from `src/features` and `src/app`, never the reverse. Shared code goes in `src/lib/` once two features need it.
