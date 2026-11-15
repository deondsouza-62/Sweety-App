import { pool } from '../db/pool.js';
import { sendEmail, mailConfigured } from './mailer.js';
import { slotReminderEmail, glucoseAlertEmail } from '../templates/emails.js';
import { logActivity } from '../utils/activity.js';
import { SLOTS, SLOT_OPENS } from '../utils/validation.js';

const SLOT_LABELS = { morning: 'Morning (fasting)', after_breakfast: 'After breakfast', after_lunch: 'After lunch', after_dinner: 'After dinner' };
const GLUCOSE_LOW = Number(process.env.GLUCOSE_LOW || 70);
const GLUCOSE_HIGH = Number(process.env.GLUCOSE_HIGH || 180);
const REMINDER_GRACE_MINUTES = Number(process.env.REMINDER_GRACE_MINUTES || 120);

const todayString = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
const nowMinutes = () => { const t = new Date(); return t.getHours() * 60 + t.getMinutes(); };
const formatTime = minutes => {
  const h = Math.floor(minutes / 60);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${suffix}`;
};

// Emails patients who haven't logged a slot REMINDER_GRACE_MINUTES after it opens.
// Runs on an interval; each reminder is sent at most once per patient/slot/day.
export async function notifyMissedSlots() {
  if (!mailConfigured) return;
  const date = todayString();
  const now = nowMinutes();
  const patients = await pool.query("SELECT id, name, email FROM users WHERE role='patient'");
  for (const patient of patients.rows) {
    for (const slot of SLOTS) {
      if (now < SLOT_OPENS[slot] + REMINDER_GRACE_MINUTES) continue;
      const dedupeKey = `${patient.id}:${date}:${slot}`;
      const [sent, logged] = await Promise.all([
        pool.query("SELECT 1 FROM activity_logs WHERE action='slot_reminder' AND entity_id=$1", [dedupeKey]),
        pool.query('SELECT 1 FROM readings WHERE user_id=$1 AND reading_date=$2 AND slot=$3', [patient.id, date, slot])
      ]);
      if (sent.rowCount || logged.rowCount) continue;
      const { subject, html } = slotReminderEmail({ name: patient.name.split(' ')[0], slotLabel: SLOT_LABELS[slot], openTime: formatTime(SLOT_OPENS[slot]) });
      const delivered = await sendEmail({ to: patient.email, subject, html });
      if (delivered) {
        await logActivity({ userId: patient.id, actorEmail: patient.email, action: 'slot_reminder', entity: 'reading', entityId: dedupeKey, details: `Reminder emailed for ${SLOT_LABELS[slot]} on ${date}` });
      }
    }
  }
}

// Emails the patient's assigned doctor when a reading lands outside the
// GLUCOSE_LOW–GLUCOSE_HIGH bandwidth. At most one alert per patient/day/direction.
export async function notifyGlucoseAlert({ userId, value, slot, date }) {
  try {
    const numeric = Number(value);
    const direction = numeric < GLUCOSE_LOW ? 'low' : numeric > GLUCOSE_HIGH ? 'high' : null;
    if (!direction) return;
    const result = await pool.query(
      `SELECT u.name AS patient_name, u.doctor_id,
              d.name AS doctor_name, d.email AS doctor_email
       FROM users u LEFT JOIN users d ON d.id = u.doctor_id AND d.role = 'doctor'
       WHERE u.id = $1`,
      [userId]
    );
    const row = result.rows[0];
    if (!row?.doctor_email) return;
    const dedupeKey = `${userId}:${date}:${direction}`;
    const sent = await pool.query("SELECT 1 FROM activity_logs WHERE action='doctor_alert_sent' AND entity_id=$1", [dedupeKey]);
    if (sent.rowCount) return;
    const { subject, html } = glucoseAlertEmail({
      doctorName: row.doctor_name.replace(/^Dr\.\s*/i, '').split(' ')[0],
      patientName: row.patient_name,
      value: numeric,
      slotLabel: SLOT_LABELS[slot] || slot,
      date,
      direction,
      low: GLUCOSE_LOW,
      high: GLUCOSE_HIGH
    });
    const delivered = await sendEmail({ to: row.doctor_email, subject, html });
    if (delivered) {
      await logActivity({ userId, actorEmail: null, action: 'doctor_alert_sent', entity: 'reading', entityId: dedupeKey, details: `${direction === 'high' ? 'High' : 'Low'} glucose alert (${numeric} mg/dL, ${slot}, ${date}) emailed to ${row.doctor_email}` });
    }
  } catch (error) {
    console.error('Glucose alert notification failed:', error.message);
  }
}
