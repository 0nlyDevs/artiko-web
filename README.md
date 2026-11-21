# Artiko Web

Next.js web app for Artiko: the LOVA museum journey today, artist and gallery pages next. It signs users in with Better Auth and talks to [artiko-api](https://github.com/0nlyDevs/artiko-api).

## Develop

```
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
pnpm build
```

## Layout

- `src/app/`: routing only. Route groups carry their own root layout: `(museum)` ships a standalone stylesheet and must not inherit Tailwind's preflight, `(app)` is the Tailwind-styled app shell.
- `src/features/<feature>/`: the code behind a route. `museum/` holds the LOVA journey shell and its static markup.
- `src/components/`: the 3D gallery walk of the home page (`gallery/`), still to be moved under `src/features/gallery/` to follow the same rule.
- `public/museum/`: vendored static assets (stylesheet, fonts, GSAP, Lenis, the journey script).

Rule: a page file only imports from `src/features` and `src/app`, never the reverse. Shared code goes in `src/lib/` once two features need it.
