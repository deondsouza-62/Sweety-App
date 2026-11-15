import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const validDate = d => DATE_RE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

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

// First/last day of the month containing the given YYYY-MM-DD date.
function monthRange(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { first, last };
}

router.get('/', async (req, res, next) => {
  try {
    const fallback = req.query.date || new Date().toISOString().slice(0, 10);
    if (!validDate(fallback)) {
      return res.status(400).json({ message: 'Please provide a valid date in YYYY-MM-DD format.' });
    }
    const daily = req.query.daily || fallback;
    const mtd = req.query.mtd || fallback;
    const monthParam = req.query.month || null;
    if (!validDate(daily) || !validDate(mtd)) {
      return res.status(400).json({ message: 'Daily and month-to-date params must be valid YYYY-MM-DD dates.' });
    }
    if (monthParam) {
      const monthNum = Number(monthParam.slice(5, 7));
      if (!MONTH_RE.test(monthParam) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: 'Month param must be in YYYY-MM format.' });
      }
    }

    let monthlyStart, monthlyEnd;
    if (monthParam) {
      const range = monthRange(`${monthParam}-01`);
      monthlyStart = range.first;
      monthlyEnd = range.last;
    } else {
      const [y, m] = fallback.split('-').map(Number);
      const previousLast = new Date(Date.UTC(y, m - 1, 0));
      monthlyStart = `${previousLast.getUTCFullYear()}-${String(previousLast.getUTCMonth() + 1).padStart(2, '0')}-01`;
      monthlyEnd = previousLast.toISOString().slice(0, 10);
    }

    const mtdRange = monthRange(mtd);
    const [dailySummary, mtdSummary, monthlySummary, readings] = await Promise.all([
      summary(req.user.id, daily, daily),
      summary(req.user.id, mtdRange.first, mtd),
      summary(req.user.id, monthlyStart, monthlyEnd),
      pool.query(
        `SELECT id, reading_date::text, slot, value FROM readings
         WHERE user_id=$1 AND reading_date=$2
         ORDER BY CASE slot WHEN 'morning' THEN 1 WHEN 'after_breakfast' THEN 2 WHEN 'after_lunch' THEN 3 ELSE 4 END`,
        [req.user.id, daily]
      )
    ]);
    res.json({
      selectedDate: fallback,
      daily: { ...dailySummary, readings: readings.rows },
      monthToDate: { ...mtdSummary, startDate: mtdRange.first, endDate: mtd },
      monthly: { ...monthlySummary, startDate: monthlyStart, endDate: monthlyEnd }
    });
  } catch (error) { next(error); }
});

export default router;
