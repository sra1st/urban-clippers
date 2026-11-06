// Phone-based client accounts: the verified phone number is the identity. No email, no password.
import { pool, q, x, isDuplicate, type RowDataPacket } from "./db";
import { BookingError } from "./errors";

/** Finds or creates the client account for a verified phone and attaches earlier guest bookings made with that number. */
export async function findOrCreateClient(phone: string): Promise<{ id: number; role: "client" }> {
  let [u] = await q<RowDataPacket>(pool, "SELECT id, role FROM users WHERE phone = ?", [phone]);
  if (!u) {
    try {
      await x(pool, "INSERT INTO users (name, email, phone, password_hash, role, is_demo) VALUES ('', NULL, ?, NULL, 'client', 0)", [phone]);
    } catch (e) {
      if (!isDuplicate(e)) throw e; // two sign-ins at once: the other one created it
    }
    [u] = await q<RowDataPacket>(pool, "SELECT id, role FROM users WHERE phone = ?", [phone]);
  }
  if (!u || u.role !== "client") throw new BookingError("AUTH", "This number can't sign in this way.");
  const id = Number(u.id);
  await x(pool, "UPDATE bookings SET user_id = ? WHERE phone = ? AND user_id IS NULL", [id, phone]);
  await x(
    pool,
    "UPDATE users SET name = COALESCE((SELECT customer_name FROM (SELECT customer_name FROM bookings WHERE phone = ? ORDER BY id DESC LIMIT 1) t), '') WHERE id = ? AND name = ''",
    [phone, id],
  );
  return { id, role: "client" };
}
