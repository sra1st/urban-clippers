# Deploy for free (about 20 minutes)

You need three accounts: GitHub, TiDB Cloud and Netlify. Nothing else.

Before you rely on it, check the current free-tier limits and idle behaviour of TiDB Cloud and Netlify on their pricing pages. Free tiers change.

## 1. Database (TiDB Cloud)

1. Create a **Serverless** cluster on the free plan.
2. Open the cluster, click **Connect**, and note the host, port (4000), user and password. Generate the password there.
3. Open **SQL Editor** and run:

```sql
CREATE DATABASE urban_clippers;
```

If this account also hosts another project, keep this one in its own database so the nightly reset can never touch other data.

## 2. Put the code on GitHub

Use your usual git flow to push this folder to a new repository. `.env.local`, `node_modules` and `.next` are already ignored.

## 3. Load the tables and demo data

Run in the project folder (`urban-clippers/`). Copy `.env.example` to `.env.local` and fill in the TiDB values (keep `DB_SSL=true`), then:

```bash
npm install
npm run db:setup
npm run test:booking
```

`db:setup` prints "Schema ready" and "Demo data loaded". `test:booking` should end with "All checks passed". If a TiDB-specific check fails, send me the output.

## 4. Netlify

1. In Netlify choose **Add new site, Import an existing project**, and pick the GitHub repository. Netlify detects Next.js and uses `netlify.toml`.
2. Before the first deploy, open **Site configuration, Environment variables** and add:

| Name | Value |
|---|---|
| `DB_HOST` | TiDB host |
| `DB_PORT` | `4000` |
| `DB_USER` | TiDB user |
| `DB_PASSWORD` | TiDB password |
| `DB_NAME` | `urban_clippers` |
| `DB_SSL` | `true` |
| `AUTH_SECRET` | 64 random hex characters (command below) |
| `CRON_SECRET` | a different long random string |
| `NEXT_PUBLIC_SITE_URL` | your Netlify URL, for example `https://urban-clippers.netlify.app` |
| `NEXT_PUBLIC_DEMO_NOTICE` | `true` (small "portfolio demo" note) or `false` |
| `OTP_DEMO_MODE` | `true` for the portfolio demo: sign-in codes are shown on screen, no SMS is sent. For a real shop remove it and set `SMS_WEBHOOK_URL` (and `SMS_WEBHOOK_TOKEN`) to your SMS gateway. |

Generate each secret with this command, run anywhere:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. Deploy. Then open `https://YOUR-SITE.netlify.app/api/health`. You should see `{"ok":true}`.
4. Optional: rename the site under **Site configuration, Change site name** to get a clean URL. Update `NEXT_PUBLIC_SITE_URL` to match and redeploy.

## Updating a site that is already live (barber choice, multi-hour bookings, phone sign-in)

Do these in order, from the project folder, with `.env.local` holding your TiDB details:

```bash
npm run db:migrate
```

Then add `OTP_DEMO_MODE` = `true` in Netlify, push the code, and run the "Reset demo data" workflow once (this clears the old sample bookings). The migration keeps all existing data and is safe to run twice. Always migrate before the new code goes live.

## 5. Nightly demo reset (GitHub Actions)

In the GitHub repository open **Settings, Secrets and variables, Actions** and add two repository secrets:

- `SITE_URL`: your Netlify URL, no trailing slash
- `CRON_SECRET`: exactly the same value as on Netlify

Then open the **Actions** tab, pick **Reset demo data**, and click **Run workflow** once. It should finish green. After that it runs every night at 02:30 Dhaka time.

GitHub pauses scheduled workflows in a repository that has had no activity for 60 days. If the demo ever looks stale, run the workflow by hand.

## 6. Optional: a real admin login

To have a private admin login (there is no demo admin), set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (use a long password) in `.env.local`, run `npm run db:setup` once, and sign in on the login page. Do not put these two values on Netlify.

## 7. Before you share the link

- Load the live site a minute before recording or sharing, in case the free database was idle.
- Replace the placeholder phone, address and email in `src/lib/site.ts` with details you control, or leave the clearly fictional ones.
- Add real photos (see PHOTOS.md).
- Book once as a guest, then sign in with your admin login and check the booking appears with a barber name.
- Run Lighthouse (Chrome DevTools) on the home page on mobile.

## 8. Record the Upwork video and GIF

Run in the project folder, with the live link:

```bash
npx playwright install chromium
BASE_URL=https://YOUR-SITE.netlify.app npm run record
```

This saves `recordings/urban-clippers-demo.webm` (about 35 seconds: home, booking, confirmation, admin). Convert it with ffmpeg:

```bash
# MP4 for Upwork
ffmpeg -i recordings/urban-clippers-demo.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart recordings/urban-clippers-demo.mp4

# Short GIF for the README (first 14 seconds)
ffmpeg -i recordings/urban-clippers-demo.webm -vf "fps=12,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer" -t 14 docs/demo.gif
```

For the "slot just taken" moment, open the booking page in two browser windows, choose the same time in both, and confirm in each. Record that part by hand with your screen recorder, since it needs two windows.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/api/health` returns `{"ok":false}` | Check the `DB_*` variables and that `DB_SSL` is `true`. |
| Build fails on Netlify | Make sure the Node version is 20 or newer (`netlify.toml` sets 22). |
| Login works locally but not live | `AUTH_SECRET` is missing on Netlify. |
| Reset workflow fails with 403 | `CRON_SECRET` differs between GitHub and Netlify. |
| Booking page shows no times | Run `npm run db:setup` once against the live database. |
