# HANDOFF: Urban Clippers (Project 2)

Owner: Shafiq Rahman Adi ("Adi"), fresher full-stack developer in Dhaka building an Upwork portfolio.
Working style: give code directly with minimal preamble. For small changes give file + exact lines + replacement, NOT whole files. He pushes to git himself but wants a full copy-paste push command (say which folder to run it in) whenever a change is ready. Terminal commands must be simple, copy-paste, with the folder stated. Commit messages end with the Co-Authored-By and Claude-Session lines he has been using.

## 1. GOAL and what "done" looks like
A realistic booking website for a men's grooming salon in Dhaka ("Urban Clippers"), shown as a live demo on his Upwork portfolio, and sellable to real salons (men's and women's) at a friendly price with customisation.
Done for the demo (essentially reached): live site works end to end on phones; customers pick services, optionally a barber, a day and a free time and are booked in under a minute; double booking is impossible; the admin can run the day; README with GIF and live link; free hosting only.
Done for resale (not reached): real SMS for OTP, barbers editable in admin, per-salon branding is easy to swap, and a sales pitch (drafted, see section 9).

## 2. CURRENT STATE
Built and working (tested locally, 49 automated checks pass, typecheck and lint clean, browser-checked; deployed and confirmed by Adi on the live site):
- Public site: home (hero, price board, "Booked in three taps", FAQ, location), services, gallery, location, contact, find-my-booking, login, account, booking flow, booking confirmation.
- Booking flow (4 steps: Services, Time, Details, Review): barber choice ("Any available barber" or a named barber, "Your usual" tag from last booking), duration-aware (1 hour base, +1 hour per Facial and skin / Hair care service), end time shown, browser Back button moves between steps (history entries).
- Confirmation page: barber ("Your choice" or "Assigned to you"), start to end time, add to calendar (.ics), WhatsApp share, reschedule, cancel (up to 2 hours before).
- Sign-in: phone number + 6-digit one-time code, no email, no password. Guest bookings with that phone join the account on first sign-in. The code is shown on screen while OTP_DEMO_MODE=true (no SMS is sent).
- Admin ("Admin login" under the phone form; username + password from env, shown as grey placeholder hint on the demo): day schedule by barber with Completed, No-show, Cancel, search; walk-in bookings; barber availability grid (a barber can be marked off for a day, existing bookings are moved or listed); edit services, prices, hours.
- Dark mode is the default (moon button in header from 640px up; text item "Dark mode" in the mobile menu); choice remembered in localStorage key `uc-theme`.
- Share preview image (Open Graph and Twitter), icon, hero GIF with SVG fallback, one-line mobile header, footer with GitHub link (github.com/sra1st).
- Demo reset: nightly GitHub Action wipes bookings and visitor accounts and restores services, hours, barbers. No seeded sample bookings (removed on request). Demo admin and demo client accounts were removed on request.
In progress: nothing half-edited. Last thing done: footer GitHub link, pushed.
Not started: real SMS provider hookup, barbers admin page, "+1 hr" tags on service cards, "Meet the barbers" row, privacy line, women's-salon demo variant, permanent booking delete.

## 3. STACK and ARCHITECTURE
- Next.js 16 (App Router, Turbopack) with React 19 and TypeScript. IMPORTANT: this Next.js has breaking changes versus older versions; the repo's AGENTS.md says to read node_modules/next/dist/docs before writing framework code.
- Tailwind CSS 4 (tokens in src/app/globals.css; dark mode is `html[data-theme="dark"]` token remaps plus a few class overrides, because "ink" and "white" are used both as text and as surfaces).
- Fonts via Fontsource (Bricolage Grotesque, Figtree). mysql2 raw parameterised SQL (no ORM), zod 4 validation, bcryptjs (admin password), jose (signed session cookie), server-only.
- Database: MySQL-compatible. TiDB Cloud Serverless in production, local MariaDB for testing.
- Hosting: Netlify (functions have a 30 second limit; the nightly reset was batched to stay under it). GitHub Actions runs the nightly reset.

### Database schema (db/schema.sql; src/lib/migrate.ts upgrades older databases idempotently)
- barbers (id, name, is_active, ...), services (id, name, category, description, price, is_active, ...), shop_hours (weekday, open/close, is_closed).
- users: id, name, email (nullable; used as the admin "username"), phone (nullable, UNIQUE), password_hash (nullable), role (client|admin), is_demo (column kept but no longer used).
- barber_days_off (barber_id, off_date).
- bookings: id, code ("UC-" + 6 chars), user_id (nullable), name, phone, booking date and start time, status, source (online|walkin), hours (default 1), barber_requested (0/1), total_bdt, note, timestamps.
- booking_services (booking_id, service_id, name/price snapshot).
- booking_slots: one row PER HOUR a booking occupies: (barber_id, slot_date, slot_time, booking_id). UNIQUE (barber_id, slot_date, slot_time) is the double-booking guard; idx_slot_booking on booking_id (no longer unique, a 2-hour booking has 2 rows).
- rate_limits (database-backed, works on serverless).
- otp_codes: phone (PK), code_hash (keyed HMAC, never the code), expires_at, sent_at, attempts.

### Folder structure
```
db/schema.sql                    tables
src/lib/                         engine, availability, bookings, auth, otp, sms, accounts, validators, config, seed-data, site, time, duration, migrate, demo-reset ...
src/app/(site)/                  public pages
src/app/admin/                   admin panel pages
src/app/api/                     route handlers
src/components/ (+ admin/)       UI components
scripts/                         setup-db, migrate-db, reset-demo, test-booking, record-demo, make-placeholders
.github/workflows/reset-demo.yml nightly reset (cron 20:30 UTC = 02:30 Dhaka)
docs/DEPLOY.md, PHOTOS.md        setup guides
```

### API routes (src/app/api/...; methods are in each route file)
- availability, availability/days: free times; query params hours, barber, exclude (booking code being rescheduled), admin.
- bookings (create; guest or signed in; rate-limited), bookings/lookup (code + phone, sets guest access cookie), bookings/[code]/reschedule, cancel, ics.
- auth/otp/request, auth/otp/verify, auth/login (admin username + password), auth/logout.
- admin/bookings (walk-in), admin/bookings/[id] (status or reassign barber), admin/barber-days, admin/hours, admin/services, admin/services/[id].
- cron/reset-demo (needs CRON_SECRET), health.
All mutating routes go through a `route()` wrapper in src/lib/api.ts: same-origin check, BookingError to JSON.

### How booking works (src/lib/engine.ts, availability.ts, duration.ts)
1. Client sends date, start time, service ids, optional barberId, name, phone. Server loads services, computes `hours` with visitHours() (base services together = 1 hour; each service whose category is "Facial and skin" or "Hair care" adds 1 hour; minimum 1).
2. Checks the slot is allowed (opening hours, window of 30 days, minimum 60 minutes lead, every hour of the visit inside opening hours) and the per-phone limit (3 active bookings).
3. Candidate barbers: the chosen barber only, or every active barber who is working that day and free for ALL hours, least busy first with random tie-break.
4. Inside one transaction: insert the booking, one booking_slots row per hour, and the service rows. A duplicate-key or retryable error rolls back and the next candidate is tried (up to 3 rounds). If none works: SLOT_TAKEN with the message the UI shows.
5. Reschedule keeps the same barber when possible, and only that barber if the customer originally chose one; a booking's own current hours do not block its new time (excludeCode / ignoreBookingId). Cancel deletes the slot rows.
6. Admin marking a barber off: affected bookings are moved to a free barber (all hour rows) or listed as unmovable.
The slot grid is only a convenience; the UNIQUE key is the guarantee. `npm run test:booking` fires 8 simultaneous requests at one time with 4 barbers and expects exactly 4 successes.

### How OTP login works (src/lib/otp.ts, sms.ts, accounts.ts, api/auth/otp/*)
request: rate limited per IP and per phone; a code can be re-requested no sooner than 30 seconds; 6-digit code, HMAC-hashed with AUTH_SECRET, stored with a 5 minute expiry and attempts = 0. sms.ts: if OTP_DEMO_MODE=true the code is returned to the page; otherwise it POSTs JSON {to, message} to SMS_WEBHOOK_URL (optional bearer SMS_WEBHOOK_TOKEN); if neither is set sign-in refuses with "not set up". verify: 5 wrong tries lock the code; success deletes it, finds or creates the client by phone (role client only), adopts earlier guest bookings with that phone, fills the account name from the latest booking, and starts a 7-day signed session cookie (`uc_session`). Guests use a separate access cookie (`uc_access`) from the lookup route.

### How admin works
Admin is a users row with role admin; email column holds the username. Login at /login under "Admin login" (POST /api/auth/login, rate limited, bcrypt). Pages under /admin and routes under /api/admin check the role on the server (requireAdmin). The admin account is created or updated by `npm run db:setup` and by the reset when ADMIN_EMAIL and ADMIN_PASSWORD are set in that environment; the reset also deletes any other admin accounts when it runs with those variables.

## 4. FILES
Everything is in the zip (HANDOFF.md at its root). Created or changed during this work, by area (paths relative to project root):
- Database and scripts: db/schema.sql (final schema), src/lib/migrate.ts (idempotent upgrade), scripts/migrate-db.ts (`npm run db:migrate`), scripts/setup-db.ts (schema, migrate, demo data, admin), scripts/reset-demo.ts, scripts/test-booking.ts (49 checks incl. barber choice, multi-hour, OTP, empty demo), scripts/record-demo.ts (phone-size walkthrough recorder), src/lib/demo-reset.ts (no seeded bookings; clears otp_codes; admin upsert).
- Engine: src/lib/engine.ts (create, reschedule, reassign, barber days off, multi-slot), src/lib/availability.ts (hourSlots, freeBarbers, getAvailability with hours/barber/exclude), src/lib/availability-params.ts (parses hours/barber/exclude), src/lib/duration.ts (visit length rule), src/lib/bookings.ts (BookingView with hours and barberRequested), src/lib/validators.ts (barberId, OTP schemas; register schema removed), src/lib/time.ts (addHoursTo), src/lib/config.ts.
- Auth: src/lib/otp.ts, src/lib/sms.ts, src/lib/accounts.ts, src/lib/auth.ts (email nullable, no demo flag), src/app/api/auth/otp/request/route.ts, src/app/api/auth/otp/verify/route.ts, src/components/AuthPanel.tsx (phone sign-in, Admin login with env placeholder hints). Deleted: src/app/api/auth/register, src/app/api/auth/demo, the register page.
- Front end: src/components/BookingFlow.tsx (barber picker, duration, history-aware steps), SlotPicker.tsx (hours, barberId, excludeCode), BookingActions.tsx, BookingRow.tsx, admin/BookingCard.tsx, Header.tsx (one-line mobile header, theme toggle), MobileMenu.tsx, ThemeToggle.tsx (new), Footer.tsx (GitHub link), Faq.tsx (barber choice = yes, hour-based length, Card payment), src/app/(site)/page.tsx (hero fits the screen, "Flexible slots", free-times block removed), book/page.tsx, booking/[code]/page.tsx, account/page.tsx, src/app/layout.tsx (dark default script), src/app/globals.css (dark mode block), opengraph-image.png and twitter-image.png (share preview). Deleted: src/components/LiveSlots.tsx.
- Docs: README.md, docs/DEPLOY.md (includes "Updating a site that is already live"), .env.example (OTP and SMS variables), AGENTS.md (written by next dev; keep it).
Note: docs/demo.gif is intentionally NOT in the zip; Adi's repo has his newer GIF.

## 5. DEPLOY SETUP
- Repo: https://github.com/sra1st/urban-clippers (branch main; Netlify deploys on push). Live: https://urbanclippers.netlify.app.
- Database: TiDB Cloud Serverless (free tier). Netlify: free plan. GitHub Actions workflow reset-demo.yml calls /api/cron/reset-demo with the secret at 02:30 Dhaka daily.
- Environment variable NAMES: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL, AUTH_SECRET, CRON_SECRET, NEXT_PUBLIC_SITE_URL (must equal the live URL; the share image address is built from it), NEXT_PUBLIC_DEMO_NOTICE, OTP_DEMO_MODE, NEXT_PUBLIC_ADMIN_HINT_USER, NEXT_PUBLIC_ADMIN_HINT_PASS (these two show the admin login as grey placeholders; delete them to hide the hint), SMS_WEBHOOK_URL, SMS_WEBHOOK_TOKEN (not set yet), and local-only ADMIN_EMAIL and ADMIN_PASSWORD (keep them out of Netlify; they are used by `npm run db:setup` from his computer, pointing at TiDB). GitHub Actions secrets: the site URL and the cron secret (see docs/DEPLOY.md).
- Order for schema changes: run `npm run db:migrate` against TiDB first, then push code. The migration was tested only on local MariaDB, but Adi has already run it on TiDB successfully.
- Dev: Node 20+, `npm install`, copy .env.example to .env.local, `npm run db:setup`, `npm run dev`. Checks: `npm run test:booking`, `npm run typecheck`, `npm run lint`.

## 6. DECISIONS and why (including rejected options)
- Next.js + TypeScript + Tailwind + raw SQL on MySQL-compatible TiDB: matches his Upwork skills; Render was considered and rejected for TiDB + Netlify to stay free and use as few accounts as possible. Firebase, Supabase and PHP were not used.
- Database UNIQUE key as the double-booking guard (not the web page); one slot row per hour so multi-hour visits use the same guard.
- Barber choice added because repeat customers are loyal; random assignment kept as an option. Rejected: forcing a choice.
- Visit length: base 1 hour, +1 hour per Facial and skin / Hair care service (Adi's rule). Massage stays inside the base hour. Cap of 4 services means at most 4 hours.
- Phone + OTP sign-in instead of email + password: Adi's request, fewer steps. Rejected: keeping the register flow, passwords for clients. OTP stored only as a keyed hash with expiry, attempt limit and resend delay. Demo mode shows the code on screen because real SMS costs money; it must be switched off for a real shop.
- Admin login kept as username + password (the username lives in the email column, no email check) and is shown as placeholder hints on the demo at Adi's request. He accepted the risk (demo data is wiped nightly). Demo client/admin buttons and demo bookings were removed on his request.
- Nightly reset kept for the demo; it must be turned off for a real salon.
- Dark mode by token remaps and class overrides. Rejected: a CSS invert filter (breaks images and header). Default is dark with a saved choice overriding.
- One deployment per salon for resale (separate site, database, admin login). Rejected for now: a true multi-salon system (needs a salon column everywhere, per-salon admins, subdomain routing).
- No real photos (Adi prefers none for a demo; placeholders and one hero GIF), fake phone and address are acceptable for the demo, and no invented reviews.
- SMS provider recommendation (not yet adopted): sms.bd (Alpha SMS) OTP non-masking, about 0.40 BDT per text, JSON API https://api.sms.net.bd/sendsms with api_key, to, msg; no sender registration; no IP whitelisting mentioned. Rejected: BulkSMSBD (needs IP whitelisting and a registered sender ID, which Netlify cannot give), Twilio-type providers (60 to 100 times the cost).
- Netlify's floating "Powered by Netlify" badge can be switched off per project in Netlify settings (Adi was told how).

## 7. KNOWN BUGS and open questions
- No known functional bugs. Not browser-checked at every page and screen size; the one-line header was checked at 320, 360, 390 and 430 px.
- Adi once saw the site light on first visit after the dark-default change and attributed it to cache; the live source and CSS were verified correct. If it recurs: private window, then check localStorage `uc-theme`.
- Not verified: delivery of real OTP texts on every operator; whether sms.bd needs a registered OTP template.
- is_demo column on users is unused (kept to avoid a migration).
- Limits for resale: barbers can only be changed in src/lib/seed-data.ts plus a reset (no admin page); bookings are cancelled, never permanently deleted; single salon per copy; no SMS reminders; no online payment.
- Open questions: does Adi want a second (women's salon) demo; pricing for salons; whether to hide the admin hint when selling; whether to allow search-engine indexing (currently noindex in src/app/layout.tsx, remove that line to allow).
- The demo footer says "Portfolio demo project: bookings are not real and data resets daily" (controlled by NEXT_PUBLIC_DEMO_NOTICE); Adi chose to keep it.

## 8. NEXT STEPS (in order)
1. Check the live site on a real phone: footer GitHub link, hero fit, dark default, booking with a chosen barber, browser Back between steps, admin hint login (admin / 1234 on the demo only).
2. Add "+1 hr" tags to facial and hair-care items in the price board and booking list, and a small "Meet the barbers" row (names and one-line specialties, no real photos), so barber choice has context. Add a short privacy line near sign-in and booking.
3. When a salon is interested: connect a real SMS provider by changing the fetch in src/lib/sms.ts to the provider's API (sms.bd is the recommendation, test delivery first), add its key as a Netlify variable, remove OTP_DEMO_MODE, redeploy.
4. Add an admin page to manage barbers (add, rename, deactivate) and a permanent-delete option, so a salon owner needs no code change.
5. Prepare the resale kit: a women's/unisex salon variant (services in seed-data.ts, wording and colours in site.ts and globals.css), a per-salon setup checklist (new Netlify site, new TiDB database, admin login, turn off the nightly reset and demo notice), and outreach by WhatsApp first, Facebook DM as fallback, using the warm pitch below.

## 9. Sales pitch (approved tone: warm, short, no introduction, "built as a demo, happy to keep the price friendly")
Short DM: "Hi [Name], hope you're well! I made an online booking site for salons as a demo, and I'd love to see it go to a salon that can use it. Customers choose a service, a stylist and a free time, and they're booked in under a minute, with no calls or back-and-forth messages. You can see the whole day's schedule on your phone. You can try it here whenever you like: https://urbanclippers.netlify.app (tap Sign in, then Admin login to see the owner side). I can change the name, logo, colours, services and prices to suit your salon, and I'll keep the price friendly. If it sounds useful, tell me what you'd want different and we'll work it out together."
Do not promise Google search ranking (the demo is noindex), SMS reminders or online payments.

## 10. Project instructions vs current state (read this first in the new chat)
The Project instructions were written earlier and differ from the build in two places. Adi decided both changes later, so the build is right and the instructions are stale:
- "Demo login buttons for client and admin": REMOVED on Adi's request. Client sign-in is phone + OTP (demo mode shows the code on screen). Admin is "Admin login" (username + password) with placeholder hints (admin / 1234). Update the Project instructions to match.
- "Client sign-in by phone + OTP, no seeded demo bookings": already built as stated.
- "No 'Sample project' label": the footer still shows the env-driven line "Portfolio demo project: bookings are not real and data resets daily" (NEXT_PUBLIC_DEMO_NOTICE). Adi chose to keep it. Delete that variable in Netlify to remove it. OPEN: confirm he is happy with this wording.
- Everything else in the instructions matches: four barbers (Roton, Anis, Akhter, Sohel) with choice or random assign, admin can mark a barber off per day, hour-based visit length with add-ons, open 7 days 10:00 to 23:00, Cash/Card/bKash/Nagad, guest and signed-in booking, UNIQUE-constraint double-booking guard inside a transaction, TiDB + Netlify + GitHub only.
- Deliverable status: live deploy DONE; README and short GIF DONE (Adi did them); 30-45 second Upwork screen recording NOT confirmed (Adi's to record or confirm).

## 11. Confirmed vs assumed
CONFIRMED (tested by me or seen live by Adi): booking engine and double-booking guard (49 local checks pass on MariaDB), migration ran on live TiDB, live site builds and deploys, dark default, admin hint, footer GitHub link, mobile header.
ASSUMED / UNVERIFIED: real SMS delivery on any operator; sms.bd's exact API behaviour and pricing (from research, not tested); TiDB-specific behaviour under heavy concurrency (only tested on MariaDB); that Adi's hand-edited files (README, GIF) match what is in the repo (the repo is the source of truth, not the zip).
