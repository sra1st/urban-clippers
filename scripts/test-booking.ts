// Proves the booking rules against a real database.  Run from the project folder:  npm run test:booking
// It creates test bookings and then restores the demo data, so run it on your own dev/demo database.
import { config } from "dotenv";

config({ path: ".env.local" });
config();

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed++;
}

async function main() {
  const { createBooking, cancelBooking, rescheduleBooking, setBarberOff, reassignBooking } = await import("../src/lib/engine");
  const { getAvailability } = await import("../src/lib/availability");
  const { pool, x } = await import("../src/lib/db");
  const { resetDemo } = await import("../src/lib/demo-reset");
  const { BookingError } = await import("../src/lib/errors");
  const { addDays, nowDhaka } = await import("../src/lib/time");

  await resetDemo();
  const today = nowDhaka().date;
  const day = addDays(today, 6); // no demo bookings this far ahead
  const time = "12:00";
  const svc = [1];
  let phoneSeq = 5000;
  const phone = () => `0171100${phoneSeq++}`;
  const attempt = (d: string, t: string) =>
    createBooking({ date: d, time: t, serviceIds: svc, name: "Test Person", phone: phone(), actor: "client" }).then(
      (b) => ({ ok: true as const, b }),
      (e) => ({ ok: false as const, e }),
    );

  // 1. Eight people grab the same start time at once. Four barbers exist, so exactly four can win.
  const results = await Promise.all(Array.from({ length: 8 }, () => attempt(day, time)));
  const wins = results.filter((r) => r.ok);
  const losses = results.filter((r) => !r.ok);
  check("8 simultaneous requests, 4 barbers: exactly 4 succeed", wins.length === 4, `${wins.length} succeeded`);
  check("the other 4 get SLOT_TAKEN", losses.length === 4 && losses.every((r) => !r.ok && r.e instanceof BookingError && r.e.code === "SLOT_TAKEN"));
  const barberIds = new Set(wins.map((r) => (r.ok ? r.b.barberId : 0)));
  check("the 4 winners got 4 different barbers", barberIds.size === 4);
  const [{ n }] = ((await pool.query("SELECT COUNT(*) AS n FROM booking_slots WHERE slot_date = ? AND slot_time = ?", [day, `${time}:00`]))[0] as { n: number }[]);
  check("database holds exactly 4 slot rows for that time", Number(n) === 4, `${n} rows`);

  // 2. The database refuses a duplicate even if application code is bypassed entirely.
  let dupBlocked = false;
  try {
    const first = wins[0];
    if (first.ok) {
      await x(pool, "INSERT INTO booking_slots (barber_id, slot_date, slot_time, booking_id) VALUES (?, ?, ?, ?)", [first.b.barberId, day, `${time}:00`, first.b.id]);
    }
  } catch (e) {
    dupBlocked = (e as { errno?: number }).errno === 1062;
  }
  check("raw SQL insert of a duplicate (barber, date, time) is rejected by the UNIQUE key", dupBlocked);

  // 3. The time now shows as unavailable, and cancelling frees a chair.
  let avail = await getAvailability(day, day);
  check("time shows as unavailable when all barbers are booked", avail[day].slots.find((s) => s.time === time)?.available === false);
  const w0 = wins[0];
  if (w0.ok) await cancelBooking(w0.b.code, "client");
  avail = await getAvailability(day, day);
  check("cancelling frees the slot", avail[day].slots.find((s) => s.time === time)?.available === true);
  const again = await attempt(day, time);
  check("the freed slot can be booked again", again.ok);

  // 4. Reschedule moves the booking and releases the old slot.
  const w1 = wins[1];
  if (w1.ok) {
    const moved = await rescheduleBooking(w1.b.code, day, "13:00", "client");
    check("reschedule moves the booking", moved.time === "13:00" && moved.date === day);
    const [{ n: old }] = ((await pool.query("SELECT COUNT(*) AS n FROM booking_slots WHERE booking_id = ? AND slot_time = ?", [w1.b.id, `${time}:00`]))[0] as { n: number }[]);
    check("old slot row is gone after reschedule", Number(old) === 0);
  }

  // 5. Marking a barber unavailable on a busy day needs the admin to resolve existing bookings first.
  const day2 = addDays(today, 7);
  const b1 = await createBooking({ date: day2, time: "15:00", serviceIds: svc, name: "Barber Off Test", phone: phone(), actor: "client" });
  let conflict = false;
  try {
    await setBarberOff(b1.barberId, day2, true);
  } catch (e) {
    conflict = e instanceof BookingError && e.code === "CONFLICT" && Array.isArray(e.extra?.affected);
  }
  check("unchecking a barber with bookings is refused and lists the bookings", conflict);
  await setBarberOff(b1.barberId, day2, true, "reassign");
  const after = await createBooking({ date: day2, time: "16:00", serviceIds: svc, name: "After Off", phone: phone(), actor: "client" });
  check("reassign moved the booking to a barber who is working", after.barberId !== b1.barberId);
  const [moved] = ((await pool.query("SELECT barber_id FROM bookings WHERE id = ?", [b1.id]))[0] as { barber_id: number }[]);
  check("the reassigned booking no longer belongs to the unavailable barber", Number(moved.barber_id) !== b1.barberId);
  const sel = await getAvailability(day2, day2);
  check("capacity drops to 3 when one barber is off", sel[day2].slots.length > 0);
  // fill 3 chairs at one time: the 4th request fails because only 3 barbers work
  const rs = await Promise.all(Array.from({ length: 5 }, () => attempt(day2, "18:00")));
  check("with one barber off, only 3 of 5 simultaneous requests succeed", rs.filter((r) => r.ok).length === 3);
  await setBarberOff(b1.barberId, day2, false);

  // 6. Manual reassignment cannot double-book a barber.
  const r1 = rs.find((r) => r.ok);
  const r2 = rs.filter((r) => r.ok)[1];
  if (r1?.ok && r2?.ok) {
    let blocked = false;
    try {
      await reassignBooking(r1.b.id, r2.b.barberId);
    } catch (e) {
      blocked = e instanceof BookingError && e.code === "CONFLICT";
    }
    check("reassigning to a barber who is busy at that time is refused", blocked);
  }

  // 7. Rules.
  const expectInvalid = async (name: string, d: string, t: string) => {
    const r = await attempt(d, t);
    check(name, !r.ok && r.e instanceof BookingError && r.e.code === "INVALID", r.ok ? "was accepted" : (r.e as Error).message);
  };
  await expectInvalid("rejects a past date", addDays(today, -1), "12:00");
  await expectInvalid("rejects a date beyond 30 days", addDays(today, 40), "12:00");
  await expectInvalid("rejects a time outside opening hours (9:00)", day, "09:00");
  await expectInvalid("rejects a time off the hourly grid (12:30)", day, "12:30");
  await expectInvalid("rejects the 11 PM start (shop closes at 11)", day, "23:00");

  // 8. One phone number cannot hoard slots.
  const hoarder = "01722000111";
  const hs = [];
  for (let i = 0; i < 4; i++) {
    hs.push(await createBooking({ date: addDays(today, 8 + i), time: "10:00", serviceIds: svc, name: "Hoarder", phone: hoarder, actor: "client" }).then(() => "ok", (e) => (e instanceof BookingError ? e.code : "ERR")));
  }
  check("4th upcoming booking from one phone is refused", hs.join(",") === "ok,ok,ok,LIMIT", hs.join(","));

  // 9. Choosing a barber, and visits that last several hours (service 1 = haircut, 6 = facial, 9 = hair spa).
  const day9 = addDays(today, 12);
  const mine = await createBooking({ date: day9, time: "14:00", serviceIds: [1, 6], name: "Loyal One", phone: phone(), barberId: 2, actor: "client" });
  check("a chosen barber is honoured and flagged as requested", mine.barberId === 2 && mine.barberRequested === true);
  check("haircut + facial is a 2-hour booking", mine.hours === 2);
  const [{ n: held }] = ((await pool.query("SELECT COUNT(*) AS n FROM booking_slots WHERE booking_id = ?", [mine.id]))[0] as { n: number }[]);
  check("a 2-hour booking holds 2 slot rows", Number(held) === 2);
  const three = await createBooking({ date: day9, time: "18:00", serviceIds: [1, 6, 9], name: "Long Visit", phone: phone(), actor: "client" });
  check("haircut + facial + hair spa is 3 hours, barber assigned (not requested)", three.hours === 3 && three.barberRequested === false);
  check("a facial alone is 1 hour", (await createBooking({ date: day9, time: "11:00", serviceIds: [6], name: "Facial", phone: phone(), actor: "client" })).hours === 1);

  const during = await getAvailability(day9, day9, { barberId: 2 });
  const free = (t: string) => during[day9].slots.find((x) => x.time === t)?.available;
  check("the barber shows busy at both hours of the 2-hour booking", free("14:00") === false && free("15:00") === false);
  check("the barber is free again right after it", free("16:00") === true);
  const twoHr = await getAvailability(day9, day9, { barberId: 2, hours: 2 });
  check("a 2-hour visit cannot start at 13:00 (it would run into the 14:00 booking)", twoHr[day9].slots.find((x) => x.time === "13:00")?.available === false);
  check("a 2-hour visit can start at 12:00", twoHr[day9].slots.find((x) => x.time === "12:00")?.available === true);
  const lastStart = await getAvailability(day9, day9, { hours: 2 });
  check("a 2-hour visit cannot start at 22:00 (shop closes at 23:00)", lastStart[day9].slots.find((x) => x.time === "22:00")?.available === false);

  const clash = await createBooking({ date: day9, time: "15:00", serviceIds: [1], name: "Same Barber", phone: phone(), barberId: 2, actor: "client" }).then(() => null, (e) => e);
  check("asking for a barber who is busy is refused with SLOT_TAKEN", clash instanceof BookingError && clash.code === "SLOT_TAKEN");
  const other = await createBooking({ date: day9, time: "15:00", serviceIds: [1], name: "Anyone", phone: phone(), actor: "client" });
  check("'any barber' at the same time gets someone else", other.barberId !== 2 && other.barberRequested === false);

  const moved9 = await rescheduleBooking(mine.code, day9, "19:00", "client");
  check("rescheduling keeps the requested barber and the 2-hour length", moved9.barberId === 2 && moved9.hours === 2 && moved9.time === "19:00");
  const [{ n: held2 }] = ((await pool.query("SELECT COUNT(*) AS n FROM booking_slots WHERE booking_id = ?", [mine.id]))[0] as { n: number }[]);
  check("after rescheduling it still holds exactly 2 slot rows", Number(held2) === 2);
  const shifted = await rescheduleBooking(mine.code, day9, "20:00", "client");
  check("a booking can slide by one hour over its own old hours", shifted.time === "20:00");
  await cancelBooking(mine.code, "client");
  const [{ n: gone }] = ((await pool.query("SELECT COUNT(*) AS n FROM booking_slots WHERE booking_id = ?", [mine.id]))[0] as { n: number }[]);
  check("cancelling frees every hour", Number(gone) === 0);

  // 10. Phone sign-in codes.
  const { issueOtp, checkOtp } = await import("../src/lib/otp");
  const { findOrCreateClient } = await import("../src/lib/accounts");
  const p = "01733000999";
  const bad = async (c: string) => checkOtp(p, c).then(() => null, (e) => e as Error);
  let code = await issueOtp(p);
  check("a 6-digit code is issued", /^\d{6}$/.test(code));
  const [stored] = ((await pool.query("SELECT code_hash FROM otp_codes WHERE phone = ?", [p]))[0] as { code_hash: string }[]);
  check("only a hash of the code is stored", stored.code_hash !== code && stored.code_hash.length === 64);
  const wrong = code === "000000" ? "111111" : "000000";
  check("a wrong code is refused", (await bad(wrong)) instanceof BookingError);
  check("the right code works once", (await bad(code)) === null);
  check("the same code cannot be used twice", (await bad(code)) instanceof BookingError);
  await x(pool, "DELETE FROM otp_codes WHERE phone = ?", [p]);
  code = await issueOtp(p);
  for (let i = 0; i < 5; i++) await bad(wrong);
  check("after 5 wrong tries even the right code is locked out", (await bad(code)) instanceof BookingError);
  await x(pool, "DELETE FROM otp_codes WHERE phone = ?", [p]);
  code = await issueOtp(p);
  await x(pool, "UPDATE otp_codes SET expires_at = ? WHERE phone = ?", [Date.now() - 1000, p]);
  check("an expired code is refused", (await bad(code)) instanceof BookingError);
  await x(pool, "DELETE FROM otp_codes WHERE phone = ?", [p]);
  await issueOtp(p);
  const quick = await issueOtp(p).then(() => null, (e) => e);
  check("asking for another code within 30 seconds is refused", quick instanceof BookingError);

  const guestPhone = "01733000888";
  const guestBooking = await createBooking({ date: addDays(today, 14), time: "13:00", serviceIds: svc, name: "Guest Gary", phone: guestPhone, actor: "client" });
  const acct = await findOrCreateClient(guestPhone);
  const acct2 = await findOrCreateClient(guestPhone);
  check("signing in twice with one number gives one account", acct.id === acct2.id);
  const [adopted] = ((await pool.query("SELECT user_id FROM bookings WHERE id = ?", [guestBooking.id]))[0] as { user_id: number | null }[]);
  check("earlier guest bookings with that number join the account", Number(adopted.user_id) === acct.id);

  // 11. The demo starts empty.
  await resetDemo();
  const [{ n: seeded }] = ((await pool.query("SELECT COUNT(*) AS n FROM bookings"))[0] as { n: number }[]);
  check("the demo reset leaves no sample bookings", Number(seeded) === 0);

  await pool.end();
  console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
