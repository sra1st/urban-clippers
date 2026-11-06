# STATUS: ALL 14 STEPS COMPLETE (2026-11-07). Only Adi's deploy remains (see DEPLOY.md, 'Updating a site that is already live').

# Urban Clippers: progress checkpoint (2026-11-06)

Request in progress: barber choice, multi-hour bookings, FAQ/home text, no demo bookings, phone + OTP sign-in.
Working copy: /home/claude/urban-clippers (cloud container). Typecheck (`npx tsc --noEmit`) passed at checkpoint time.

## Status at second checkpoint (2026-11-06)
Typecheck passed after the last applied edit. The last SlotPicker edit was interrupted and NOT applied (SlotPicker.tsx is unchanged).
Local MariaDB must be restarted if the container was reclaimed: `mariadbd --user=mysql --bind-address=127.0.0.1` then `npm run db:setup` (.env.local is not in the zip; recreate: DB user uc_local/uc_local_pw, DB urban_clippers, DB_SSL=false, AUTH_SECRET/CRON_SECRET placeholders >=32 chars, OTP_DEMO_MODE=true).

## DONE
- Step 10 (DB): schema.sql, src/lib/migrate.ts, scripts/migrate-db.ts, `npm run db:migrate` (verified on local MariaDB, idempotent), setup-db calls migrate, demo-reset has NO seeded bookings (verified: 0 bookings).
- Step 11 (engine/API): duration.ts, time.addHoursTo, availability.ts (hours/barberId/excludeCode), availability-params.ts, engine.ts (optional barberId, per-hour slot rows via insertSlots, reschedule keeps/forces chosen barber, setBarberOff uses hours), bookings.ts (hours, barberRequested), validators (barberId, otp schemas, registerSchema removed), /api/bookings passes barberId and fills empty user name, /api/availability and /days read hours/barber/exclude.
- Step 12 (OTP sign-in): otp.ts, sms.ts (OTP_DEMO_MODE / SMS_WEBHOOK_URL), accounts.ts, /api/auth/otp/request + /verify, register route/page deleted, auth.ts email nullable, login route safe for null password, new AuthPanel (phone + code, demo buttons, staff sign-in), login and account pages updated.
- Step 13 partly: Faq.tsx (barber=yes, hour-based length, Card), home step 3 text, Card added to payment copy (home, services page, booking page, BookingFlow summary).

## NEXT (exact order)
1. SlotPicker.tsx: add props hours=1, barberId=null, excludeCode=null; build qs=`hours=${hours}&barber=${barberId}&exclude=${code}`; add qs to dayKey, to both fetch URLs (/api/availability/days?qs and /api/availability?date=..&qs) and to the days-effect deps.
2. BookingFlow.tsx: new props barbers [{id,name}] and lastBarberId; compute hours = visitHours(chosen services with category from groups; FlowGroup items need category); state barberId (null = any); barber chip picker in step 2 ("Any available barber" + barbers, "Your usual" tag); clear time when hours/barber change; send barberId in POST; summary shows barber + duration (hoursLabel) + time range using addHoursTo; replace step 2/step 1 copy ("We assign whichever barber is free..." and "Extras like a facial fit inside the same visit"); step 3 text "No account needed" fine; "Have an account? Sign in" -> "Sign in with your number".
3. book/page.tsx: pass barbers (listBarbers), category in groups, lastBarberId (listUserBookings(user.id)[0]?.barberId).
4. BookingActions.tsx + booking/[code]/page.tsx: pass hours, barberId (only if barberRequested), code to SlotPicker; show duration, end time, "You chose X" vs "Assigned"; calendar end = start + hours*60.
5. BookingRow.tsx and admin BookingCard.tsx: show duration (e.g. 2 hr) and "Requested" chip.
6. scripts/test-booking.ts: expectations (day offsets fine; add barber-specific booking, 2-hour hold blocks both hours, requested-barber conflict, OTP issue/check/expiry/attempts, accounts adoption). scripts/record-demo.ts update for new sign-in/barber step.
7. `npm run lint`, `npm run build`, browser check (Playwright), README + docs/DEPLOY.md updates (migrate first, OTP_DEMO_MODE, SMS webhook), final zip.
8. Give Adi the push command. Deploy order: `npm run db:migrate` against TiDB FIRST, then push, set OTP_DEMO_MODE=true in Netlify, run reset workflow once. TiDB migration untested locally.
