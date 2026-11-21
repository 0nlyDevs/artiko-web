# Artiko Web

Next.js web app for Artiko: the LOVA museum journey today, artist and gallery pages next. It signs users in through Keycloak with Auth.js and talks to [artiko-api](https://github.com/0nlyDevs/artiko-api), as specified in SOLUTION-6.

## Develop

```
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
pnpm build
```

## Auth and API

- Copy `.env.example` to `.env.local` and fill it in: Keycloak realm, client and the Auth.js secret.
- Auth.js keeps the Keycloak tokens in its encrypted HTTP-only cookie and refreshes them (access tokens last 5 minutes). Server code reads the access token with `getAccessToken()` from `@/lib/auth`; it never reaches browser JavaScript.
- `src/lib/api.ts` is the only entry point to the API. Its client is generated from `artiko-api/openapi.yml`: run `pnpm api:generate` (set `OPENAPI_SPEC` to another path or URL if the sibling checkout is elsewhere) and commit the result.

## Layout

- `src/app/`: routing only. Route groups carry their own root layout: `(museum)` ships a standalone stylesheet and must not inherit Tailwind's preflight, `(app)` is the Tailwind-styled app shell.
- `src/features/<feature>/`: the code behind a route. `museum/` holds the LOVA journey shell and its static markup.
- `src/components/`: the 3D gallery walk of the home page (`gallery/`), still to be moved under `src/features/gallery/` to follow the same rule.
- `src/lib/`: `auth.ts` (Auth.js + Keycloak), `api.ts` and `api-client/` (generated, do not edit).
- `public/museum/`: vendored static assets (stylesheet, fonts, GSAP, Lenis, the journey script).

Rule: a page file only imports from `src/features` and `src/app`, never the reverse. Shared code goes in `src/lib/` once two features need it.
