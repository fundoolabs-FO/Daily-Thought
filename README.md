# Daily Thought

A small installable web app (PWA). Each day you get one thoughtful idea, can write an optional one-line reflection, and mark the day as done to keep a streak going.

- **Stack:** Next.js 16 (App Router, TypeScript), Supabase (Postgres + Auth) through `@supabase/ssr`, hosted on Vercel.
- **Auth:** email + password (sign up, email confirmation, forgot/reset password) and Google sign-in.
- **Environments:** `main` deploys to Production on your domain and uses the **prod** Supabase project. `develop` and other branches deploy to Vercel Preview and use the **dev** Supabase project.

> In this README, `yourdomain.com` stands for your real domain. Replace it everywhere.

---

## How it works

| Piece | Where |
| --- | --- |
| Schema, RLS, `get_daily_thought(p_tz)`, `get_streak(p_tz)` | [supabase/migrations/](supabase/migrations/) (`001_init.sql`, `002_fix_get_daily_thought.sql`) |
| 64 original, unattributed thoughts | [supabase/seed.sql](supabase/seed.sql) |
| Session refresh and route protection (`/today`) | [src/proxy.ts](src/proxy.ts), [src/lib/supabase/proxy.ts](src/lib/supabase/proxy.ts) |
| OAuth / email-link code exchange | [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts) |
| Auth pages and server actions | [src/app/(auth)/](src/app/(auth)/) |
| Today page (thought, reflection, done, streak, last 7 days) | [src/app/today/](src/app/today/) |
| Full-screen pop-up | [src/components/ThoughtModal.tsx](src/components/ThoughtModal.tsx) |
| Service worker | [public/sw.js](public/sw.js) |
| Manifest / icons | [src/app/manifest.ts](src/app/manifest.ts), [scripts/generate-icons.mjs](scripts/generate-icons.mjs) |

**The thought of the day.** The browser saves its IANA timezone in a `dt_tz` cookie. `/today` passes that value to `get_daily_thought(p_tz)`, a `SECURITY DEFINER` function. The function works out the user's local date. If there's no `daily_thoughts` row for `(user_id, day)` yet, it inserts one with a random active thought the user hasn't seen in the last 60 days. If every thought was used recently, it falls back to the least recently seen one. Because `(user_id, day)` is the primary key, the thought stays the same across refreshes, devices and concurrent requests.

**Security.** RLS is enabled on both tables. Users can only `SELECT`/`UPDATE` their own `daily_thoughts` rows. Column grants limit updates to `reflection` and `completed_at`. There are no insert or delete policies: rows are created only by the function. A trigger blocks edits to rows older than yesterday (UTC), so a streak can't be back-filled through the API.

**When the pop-up appears.** It appears after every sign-in: the login action and `/auth/callback` set a short-lived `dt_fresh_login` cookie, which the pop-up reads and then clears. It also appears on the first visit of the local day on each device (tracked in `localStorage`). You can reopen it with **View full screen**.

**Streak.** The streak counts consecutive completed days. If today isn't done yet, the streak still shows the run up to yesterday.

---

## Local development

```bash
cp .env.example .env.local   # fill in the DEV Supabase project values
npm install
npm run dev                  # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run build` / `npm start` | Production build / server (the service worker registers only in production builds) |
| `npm run lint`, `npm run typecheck` | ESLint / TypeScript |
| `npm run icons` | Regenerate `public/icons/*` and `src/app/icon.png` |

Environment variables (see [.env.example](.env.example)):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (Project Settings → API Keys) |

---

## 1. Supabase setup (do this for both projects)

Create **two** projects at [supabase.com](https://supabase.com), for example `daily-thought-dev` and `daily-thought-prod`.

### 1.1 Run the SQL

Easiest, with the Supabase CLI from the project folder:

```bash
npx supabase login
npx supabase link --project-ref <20-letter-project-ref>   # asks for the database password
npx supabase db push --include-seed
```

Or, in the dashboard **SQL Editor**, run these files in order:

1. [supabase/migrations/001_init.sql](supabase/migrations/001_init.sql)
2. [supabase/migrations/002_fix_get_daily_thought.sql](supabase/migrations/002_fix_get_daily_thought.sql)
3. [supabase/seed.sql](supabase/seed.sql)

The files are safe to run again.

When creating a project, keep **Enable Data API** on. **Automatically expose new tables** can be off, because the migration grants exactly the privileges the app needs.

To add more thoughts later: `insert into public.thoughts (body) values ('…');`. To retire one: `update public.thoughts set active = false where id = …;`.

### 1.2 Email auth

Go to **Authentication → Sign In / Providers → Email**:

- **Enable** the Email provider and keep **Confirm email** on.
- Minimum password length: 8 (the app checks this too).

For production, set up **custom SMTP** (Authentication → Emails → SMTP Settings). The built-in sender is heavily rate-limited.

Optional: cross-device email links. By default, confirmation and reset links use the PKCE `code` flow, so they must be opened in the same browser that requested them. To make them work on any device, edit the templates under **Authentication → Emails**:

- *Confirm signup*: `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirm your email</a>`
- *Reset password*: `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset password</a>`

`/auth/callback` accepts both link formats.

### 1.3 URL configuration

Go to **Authentication → URL Configuration**. Supabase only redirects to URLs on this list, so every origin the app runs on must be listed.

**Dev project**

| Setting | Value |
| --- | --- |
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/**` |
| | `https://*-<your-vercel-team-slug>.vercel.app/**` (all Preview deployments) |

Your Vercel team slug is the account or team part of preview URLs, for example `daily-thought-git-develop-`**`acme`**`.vercel.app`.

**Prod project**

| Setting | Value |
| --- | --- |
| Site URL | `https://yourdomain.com` |
| Redirect URLs | `https://yourdomain.com/**` |
| | `https://www.yourdomain.com/**` (if you use `www`) |

### 1.4 Google sign-in

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. Go to **APIs & Services → OAuth consent screen** (Google Auth Platform). Set the app name, support email, and authorised domains: `yourdomain.com` and `supabase.co`. The scopes are `openid`, `email` and `profile`. **Publish** the app when you go live.
3. Go to **Clients → Create client → Web application**.
   - **Authorised JavaScript origins:** `http://localhost:3000` and `https://yourdomain.com`.
   - **Authorised redirect URIs:** the Supabase callback for each project.
     - `https://<dev-project-ref>.supabase.co/auth/v1/callback`
     - `https://<prod-project-ref>.supabase.co/auth/v1/callback`
   - You can use one client with both URIs, or create one client per project.
4. In each Supabase project, go to **Authentication → Sign In / Providers → Google**. Turn it on and paste the **Client ID** and **Client Secret**.

The flow: the app sends the user to Google, Google returns them to Supabase's `/auth/v1/callback`, and Supabase sends them back to the app's `/auth/callback?code=…`. That route exchanges the code for a session cookie and redirects to `/today`.

---

## 2. Git branches

```text
main     → Vercel Production (yourdomain.com)  → prod Supabase project
develop  → Vercel Preview                       → dev Supabase project
```

Work on `develop` (or on feature branches off it). Merge into `main` to release.

```bash
git remote add origin git@github.com:<you>/daily-thought.git
git push -u origin main develop
```

---

## 3. Vercel setup

1. **Add New → Project** and import the GitHub repo. Vercel detects Next.js; keep the defaults.
2. **Settings → Git → Production Branch:** `main`. Pushes to `develop` then create Preview deployments.
3. **Settings → Environment Variables.** Add both variables once per environment:

   | Variable | Production | Preview | Development |
   | --- | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | prod project URL | dev project URL | dev project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod publishable key | dev publishable key | dev publishable key |

   `NEXT_PUBLIC_*` values are inlined at build time, so **redeploy** after changing them. `vercel env pull .env.local` copies the Development values to your machine.
4. Push `develop` and check the Preview URL. Then merge into `main` and check Production.

Preview deployments have **Vercel Authentication** (Deployment Protection) turned on by default. This is fine in a browser. But to install a preview as a PWA on a phone, where manifest and service-worker requests can't carry your Vercel login, turn it off for Preview or use a protection-bypass link.

---

## 4. Custom domain and DNS

1. In Vercel, go to **Project → Settings → Domains** and add `yourdomain.com` and `www.yourdomain.com`. Choose one as the primary; the other redirects to it. Assign both to the **Production** environment (the `main` branch).
2. At your DNS provider, create the records Vercel shows. They are usually:

   | Type | Name | Value |
   | --- | --- | --- |
   | `A` | `@` | `76.76.21.21` (or the IP Vercel shows for your project) |
   | `CNAME` | `www` | `cname.vercel-dns.com` (or the project-specific value shown) |

   Alternatively, switch the domain's nameservers to Vercel's (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
3. Wait for Vercel to show **Valid Configuration**. It issues the HTTPS certificate automatically, and PWAs require HTTPS.
4. Make sure the domain appears in the **prod** Supabase URL configuration (§1.3) and in the Google client's JavaScript origins (§1.4).

---

## 5. Testing the PWA install

The service worker only registers in **production builds** and only on **secure origins**. `http://localhost` counts as secure; a LAN IP like `http://192.168.x.x` does not. So test on a phone with the Production domain or a (non-protected) Preview URL, or tunnel a local `npm run build && npm start` through something like `cloudflared` or `ngrok`.

### Android (Chrome)

1. Open `https://yourdomain.com` and sign in.
2. The **Install Daily Thought** banner appears at the bottom of `/today`. It uses `beforeinstallprompt`. Tap **Install**. You can also use Chrome menu **⋮ → Install app / Add to Home screen**.
3. Launch it from the home screen. It should open standalone (no browser UI) at `/today`, and the icon should be the maskable version.
4. Test offline: open `/today` once, turn on airplane mode, and relaunch. You should see the cached page. A page you haven't opened yet shows the **You're offline** fallback.
5. Debug: connect the phone over USB, open `chrome://inspect` on your desktop, and go to **Application**. Check **Manifest** (installability errors), **Service workers** and **Cache storage**.

If you dismissed the banner, clear the site's storage to see it again. Chrome also stops offering the prompt for a while after it's dismissed.

### iOS / iPadOS (Safari)

iOS has no `beforeinstallprompt`. Instead the app shows a hint: **Tap Share, then Add to Home Screen**.

1. Open `https://yourdomain.com` in **Safari** and sign in.
2. Tap **Share** (square with an arrow), then **Add to Home Screen**, then **Add**. On iOS 16.4+ this also works from Chrome and Edge's share menu.
3. Launch it from the home screen. It should open full-screen at `/today`, using `apple-touch-icon.png`.
4. Installed iOS web apps have their own cookie jar, separate from Safari, so you'll sign in again inside the app. Test Google sign-in from the installed app on your target iOS version. If the OAuth round-trip ends in Safari instead of the app, email and password sign-in inside the app always works.
5. Debug: on the iPhone, go to **Settings → Safari → Advanced → Web Inspector**. Connect it to a Mac and use Safari → **Develop → [device]**.

### After deploying a change

`/sw.js` is served with `Cache-Control: no-cache, no-store, must-revalidate`, so browsers check for a new worker on every navigation. Bump `VERSION` in [public/sw.js](public/sw.js) whenever you change the caching strategy; this drops old caches. On sign-out, the app deletes all caches before ending the session.

---

## Service worker strategy

| Request | Strategy |
| --- | --- |
| Page navigations | Network-first. Successful pages are cached. When offline, the cached copy is served, or `/offline` if there isn't one. |
| `/_next/static/*` | Cache-first (the files are content-hashed) |
| `/auth/*`, non-GET, cross-origin (Supabase, Google) | Not handled; always goes to the network |
| Everything else (RSC payloads, images) | Network |
