# Redesign and verified accounts

Goal: rebuild every artiko-web page from the approved design (https://claude.ai/artifact/9RYuJepSJJ9gcXSwU7Zj9N), responsive from 320 px phones to wide desktops, with social-app motion; drop `/museum`; sign-up in two steps (name + email, then password) with no OAuth; accounts must verify their email before they can sign in, and can reset a forgotten password.

Out of scope: OAuth, phone/SMS sign-in, intercepting-route modals, API search endpoint, home gallery `/` (kept as the team made it).

## Architecture

- Better Auth (`src/lib/auth.ts`) gains `requireEmailVerification`, verification and reset emails sent by `src/lib/email.ts` (Resend HTTP API, no SDK; dev without a key logs the link), the Have I Been Pwned check, and rate limits on every email-sending endpoint. artiko-api refuses tokens whose `emailVerified` claim is not true (defence in depth).
- One app shell for the pages: left rail (lg: labels, md: icons), bottom tab bar + top bar on phones. Shared motion primitives in `src/lib/ui/` (sliding chips, sliding tabs, segmented control, skeletons) and CSS keyframes in `globals.css`, all off under `prefers-reduced-motion`.
- Auth pages live in their own route group `(auth)` with the split video layout; the videos are Mixkit clips in `public/auth/`.

## Tasks

1. **API: verified email required.** `artiko-api/app/platform/auth.py` `decode_token` raises `Forbidden("email_not_verified")` unless `claims["emailVerified"] is True`; `tests/conftest.py` `make_token` adds `emailVerified=True` by default. verify: `pytest tests/test_auth*.py` in CI, new test for an unverified token (403) and a verified one (200 on `/me`).
2. **Email sender.** `src/lib/email.ts`: `sendEmail({ to, subject, html, text })` posts to `https://api.resend.com/emails` with `RESEND_API_KEY` and `EMAIL_FROM`; without a key outside production it logs the text instead. `emailLocale(request)` picks en/fr/mg from `accept-language`. verify: `src/lib/email.test.ts` (payload sent, dev log, error on non-2xx).
3. **Better Auth security.** `auth.ts`: `requireEmailVerification`, `sendResetPassword`, `resetPasswordTokenExpiresIn: 3600`, `revokeSessionsOnPasswordReset`, `emailVerification { sendOnSignUp, sendOnSignIn, autoSignInAfterVerification, expiresIn: 3600 }`, `haveIBeenPwned()`, rate limits on `/send-verification-email`, `/request-password-reset`, `/reset-password`; production guard requires `RESEND_API_KEY` and `EMAIL_FROM`. Strings `email.*` in en/fr/mg. verify: `auth.test.ts` new guard cases, `pnpm test`.
4. **Design tokens and motion.** `globals.css`: `--surface #F6F0EA`, `--line #EDE5DD`, utility classes `.rise`, `.skel`, `.pop`, `.burst`, reduced-motion block. `src/lib/ui/`: `sliding-chips.tsx` (links, pill measured from the active one), `sliding-tabs.tsx` (buttons, underline), `segmented.tsx` (2 options), `avatar.tsx` (initials). verify: lint + build.
5. **App shell.** `src/features/site/app-shell.tsx` (rail + mobile bars, active link from `usePathname`, language switch inside), `(pages)/layout.tsx` uses it; `site-header.tsx` removed. verify: browser at 1440, 900, 390 px.
6. **Explore.** search (`q`, filtered server-side over the fetched list: `shortcut:`), month select (`month`, last 12 months) beside it, artists row, sliding category chips, `WorkTile` grid, skeleton keyed on the filters, empty state. `src/lib/works/work-tile.tsx`, `src/lib/months.ts` `lastMonths(n)`, `src/lib/works/search.ts` `matchesQuery`. verify: unit tests for `lastMonths`, `matchesQuery`; browser.
7. **Work page and vote.** `/works/[id]` (dark sheet, media + panel, story, proofs, vote, double-click heart burst, close = back). `vote-button.tsx` restyled, keeps its error mapping. verify: browser vote on local API.
8. **Artist page.** `/artists/[id]` three columns (related | expositions + tabs + grid | artist card), client filter of the works; 3D museum moves to `/artists/[id]/museum`. verify: browser, 3 widths.
9. **Hall of Fame, Heritage, Scan** restyled per design (podium, counters + table with succession bar, scan sweep + skeleton). verify: browser.
10. **My space.** header with stats, sliding tabs (works, publish, votes, profile), publish form with drop zones, exposition select and proof visibility. verify: publish on local API.
11. **Auth pages.** `(auth)` layout with video side; `/sign-in` (resend link when `EMAIL_NOT_VERIFIED`), `/sign-up` two steps then "check your inbox", `/forgot-password`, `/reset-password`; `src/lib/password.ts` `passwordProblems(password, confirm)`. verify: `password.test.ts`; local sign-up, link from the dev log, sign-in, reset.
12. **Remove `/museum`** route group, `features/museum`, its public files not used by the home gallery. verify: `grep -r "/museum/" src` only lists gallery assets; build.

## Edge cases

- Existing unverified accounts can no longer sign in: sign-in sends a fresh link (`sendOnSignIn`) and shows a resend button (task 11).
- Forgot-password never says whether the email exists (task 11, same message both ways).
- A reset link that expired lands with `?error=INVALID_TOKEN`: the page says so and offers a new link (task 11).
- Explore with `?month=` in the future or malformed falls back to the current month (task 6, `lastMonths` test).
- Works that are audio, video or 3D have no image: tiles and the work page show a labelled block (tasks 6, 7).

Decision: merge the web PR only after `RESEND_API_KEY` and `EMAIL_FROM` exist on Vercel - the production guard would otherwise stop every auth route.
