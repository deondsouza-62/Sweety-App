import { Router } from 'express';
import { pool } from '../db/pool.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

async function isAssigned(patientId, doctorId) {
  const result = await pool.query(
    'SELECT id FROM users WHERE id=$1 AND doctor_id=$2 AND role=$3',
    [patientId, doctorId, 'patient']
  );
  return result.rowCount > 0;
}

async function summary(userId, start, end) {
  const result = await pool.query(
    `SELECT MAX(value)::int AS highest, MIN(value)::int AS lowest,
            ROUND(AVG(value)::numeric, 1)::float AS average,
            COUNT(*)::int AS count
     FROM readings WHERE user_id=$1 AND reading_date BETWEEN $2 AND $3`,
    [userId, start, end]
  );
  const row = result.rows[0];
  return { highest: row.highest, lowest: row.lowest, average: row.average, count: row.count };
}

router.get('/patients', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at::text AS created_at
       FROM users WHERE doctor_id=$1 AND role='patient'
       ORDER BY name`,
      [_req.user.id]
    );
    res.json({ patients: result.rows });
  } catch (error) { next(error); }
});

router.get('/patients/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid patient id.' });
    if (!(await isAssigned(req.params.id, req.user.id))) {
      return res.status(404).json({ message: 'Patient not found.' });
    }
    const [patient, readings] = await Promise.all([
      pool.query(
        `SELECT u.id, u.name, u.email, u.created_at::text AS created_at,
                d.name AS doctor_name, d.specialization AS doctor_specialization
         FROM users u LEFT JOIN users d ON d.id = u.doctor_id
         WHERE u.id=$1`,
        [req.params.id]
      ),
      pool.query(
        `SELECT id, reading_date::text, slot, value FROM readings
         WHERE user_id=$1
         ORDER BY reading_date DESC, CASE slot
           WHEN 'morning' THEN 1 WHEN 'after_breakfast' THEN 2
           WHEN 'after_lunch' THEN 3 ELSE 4 END
         LIMIT 60`,
        [req.params.id]
      )
    ]);
    res.json({ patient: patient.rows[0], readings: readings.rows });
  } catch (error) { next(error); }
});

router.get('/patients/:id/report', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid patient id.' });
    if (!(await isAssigned(req.params.id, req.user.id))) {
      return res.status(404).json({ message: 'Patient not found.' });
    }
    const patientId = req.params.id;
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const validDate = d => DATE_RE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
    const monthRange = dateStr => {
      const [y, m] = dateStr.split('-').map(Number);
      return { first: `${y}-${String(m).padStart(2, '0')}-01`, last: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
    };
    const fallback = req.query.date || new Date().toISOString().slice(0, 10);
    if (!validDate(fallback)) {
      return res.status(400).json({ message: 'Please provide a valid date in YYYY-MM-DD format.' });
    }
    const dailyDate = req.query.daily || fallback;
    const mtdDate = req.query.mtd || fallback;
    const monthParam = req.query.month || null;
    if (!validDate(dailyDate) || !validDate(mtdDate)) {
      return res.status(400).json({ message: 'Daily and month-to-date params must be valid YYYY-MM-DD dates.' });
    }
    if (monthParam && (!/^\d{4}-\d{2}$/.test(monthParam) || Number(monthParam.slice(5, 7)) < 1 || Number(monthParam.slice(5, 7)) > 12)) {
      return res.status(400).json({ message: 'Month param must be in YYYY-MM format.' });
    }
    let monthlyStart, monthlyEnd;
    if (monthParam) {
      const range = monthRange(`${monthParam}-01`);
      monthlyStart = range.first; monthlyEnd = range.last;
    } else {
      const [y, m] = fallback.split('-').map(Number);
      const previousLast = new Date(Date.UTC(y, m - 1, 0));
      monthlyStart = `${previousLast.getUTCFullYear()}-${String(previousLast.getUTCMonth() + 1).padStart(2, '0')}-01`;
      monthlyEnd = previousLast.toISOString().slice(0, 10);
    }
    const mtdRange = monthRange(mtdDate);
    const [daily, monthToDate, monthly, readings] = await Promise.all([
      summary(patientId, dailyDate, dailyDate),
      summary(patientId, mtdRange.first, mtdDate),
      summary(patientId, monthlyStart, monthlyEnd),
      pool.query(
        `SELECT id, reading_date::text, slot, value FROM readings
         WHERE user_id=$1 AND reading_date=$2
         ORDER BY CASE slot WHEN 'morning' THEN 1 WHEN 'after_breakfast' THEN 2 WHEN 'after_lunch' THEN 3 ELSE 4 END`,
        [patientId, dailyDate]
      )
    ]);
    await logActivity({ userId: req.user.id, actorEmail: req.user.email, action: 'patient_report_viewed', entity: 'patient', entityId: patientId, details: `Viewed report for patient ${patientId} on ${dailyDate}` });
    res.json({
      patientId,
      selectedDate: fallback,
      daily: { ...daily, readings: readings.rows },
      monthToDate: { ...monthToDate, startDate: mtdRange.first, endDate: mtdDate },
      monthly: { ...monthly, startDate: monthlyStart, endDate: monthlyEnd }
    });
  } catch (error) { next(error); }
});

export default router;
