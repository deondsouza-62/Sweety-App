import { Router } from 'express';
import { pool } from '../db/pool.js';
import { validateReading } from '../utils/validation.js';
import { logActivity } from '../utils/activity.js';
import { notifyGlucoseAlert } from '../services/notifications.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '100', 10), 1), 100);
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT id, reading_date::text, slot, value, created_at, updated_at,
              COUNT(*) OVER()::int AS total_count
       FROM readings WHERE user_id = $1
       ORDER BY reading_date DESC, CASE slot
         WHEN 'morning' THEN 1 WHEN 'after_breakfast' THEN 2
         WHEN 'after_lunch' THEN 3 ELSE 4 END
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    const total = result.rows[0]?.total_count ?? 0;
    const readings = result.rows.map(({ total_count, ...r }) => r);
    res.json({ readings, page, limit, total });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  const errorMessage = validateReading(req.body);
  if (errorMessage) return res.status(400).json({ message: errorMessage });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const count = await client.query(
      'SELECT COUNT(*)::int AS count FROM readings WHERE user_id=$1 AND reading_date=$2',
      [req.user.id, req.body.date]
    );
    if (count.rows[0].count >= 4) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'You can add only 4 readings per day.' });
    }
    const result = await client.query(
      `INSERT INTO readings(user_id, reading_date, slot, value)
       VALUES($1, $2, $3, $4)
       RETURNING id, reading_date::text, slot, value`,
      [req.user.id, req.body.date, req.body.slot, Number(req.body.value)]
    );
    await client.query('COMMIT');
    await logActivity({ userId: req.user.id, actorEmail: req.user.email, action: 'reading_created', entity: 'reading', entityId: result.rows[0].id, details: `Added ${result.rows[0].value} mg/dL (${req.body.slot.replaceAll('_', ' ')}) on ${req.body.date}` });
    notifyGlucoseAlert({ userId: req.user.id, value: result.rows[0].value, slot: req.body.slot, date: req.body.date });
    res.status(201).json({ reading: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ message: `You already have a ${req.body.slot?.replaceAll('_', ' ')} reading for this date.` });
    next(error);
  } finally { client.release(); }
});

router.put('/:id', async (req, res, next) => {
  const errorMessage = validateReading(req.body);
  if (errorMessage) return res.status(400).json({ message: errorMessage });
  try {
    const result = await pool.query(
      `UPDATE readings SET reading_date=$1, slot=$2, value=$3, updated_at=NOW()
       WHERE id=$4 AND user_id=$5
       RETURNING id, reading_date::text, slot, value`,
      [req.body.date, req.body.slot, Number(req.body.value), req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Reading not found.' });
    await logActivity({ userId: req.user.id, actorEmail: req.user.email, action: 'reading_updated', entity: 'reading', entityId: result.rows[0].id, details: `Updated reading to ${result.rows[0].value} mg/dL (${result.rows[0].slot.replaceAll('_', ' ')}) on ${result.rows[0].reading_date}` });
    res.json({ reading: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'A reading already exists for this time slot and date.' });
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM readings WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Reading not found.' });
    await logActivity({ userId: req.user.id, actorEmail: req.user.email, action: 'reading_deleted', entity: 'reading', entityId: req.params.id });
    res.json({ message: 'Reading deleted successfully.' });
  } catch (error) { next(error); }
});

export default router;
