import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

const USER_SELECT = `SELECT u.id, u.name, u.email, u.role, u.specialization, u.doctor_id,
        u.created_at::text AS created_at, d.name AS doctor_name
        FROM users u LEFT JOIN users d ON d.id = u.doctor_id`;

function validRole(role) {
  return role === 'patient' || role === 'doctor';
}

router.get('/users', async (req, res, next) => {
  try {
    const role = req.query.role;
    if (!validRole(role)) return res.status(400).json({ message: 'Role must be patient or doctor.' });
    const result = await pool.query(`${USER_SELECT} WHERE u.role=$1 ORDER BY u.name`, [role]);
    res.json({ users: result.rows });
  } catch (error) { next(error); }
});

router.post('/users', async (req, res, next) => {
  try {
    const { name, email, password, role, specialization, doctor_id } = req.body;
    if (!name?.trim() || !email?.trim() || !password || !validRole(role)) {
      return res.status(400).json({ message: 'Name, email, password and a valid role (patient or doctor) are required.' });
    }
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    let assignedDoctor = null;
    if (role === 'patient' && doctor_id) {
      const doc = await pool.query("SELECT id FROM users WHERE id=$1 AND role='doctor'", [doctor_id]);
      if (!doc.rowCount) return res.status(400).json({ message: 'Assigned doctor not found.' });
      assignedDoctor = doctor_id;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users(name, email, password_hash, role, specialization, doctor_id)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role`,
      [name.trim(), email.trim().toLowerCase(), passwordHash, role, specialization?.trim() || null, assignedDoctor]
    );
    const user = result.rows[0];
    await logActivity({ userId: req.user.id, actorEmail: req.user.email, action: 'user_created', entity: role, entityId: user.id, details: `Created ${role} ${user.name} <${user.email}>` });
    res.status(201).json({ user });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid user id.' });
    const target = await pool.query('SELECT id, name, email, role FROM users WHERE id=$1', [req.params.id]);
    const existing = target.rows[0];
    if (!existing) return res.status(404).json({ message: 'User not found.' });
    if (existing.role === 'admin') return res.status(403).json({ message: 'Admin accounts cannot be edited here.' });
    if (existing.id === req.user.id) return res.status(403).json({ message: 'You cannot edit your own account here.' });

    const { name, email, password, specialization, doctor_id } = req.body;
    const updates = [];
    const values = [];
    const push = (col, val) => { values.push(val); updates.push(`${col}=$${values.length}`); };
    if (name !== undefined) { if (!name?.trim()) return res.status(400).json({ message: 'Name cannot be empty.' }); push('name', name.trim()); }
    if (email !== undefined) { if (!email?.trim()) return res.status(400).json({ message: 'Email cannot be empty.' }); push('email', email.trim().toLowerCase()); }
    if (specialization !== undefined) push('specialization', specialization?.trim() || null);
    if (password) {
      if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
      push('password_hash', await bcrypt.hash(password, 12));
    }
    if (existing.role === 'patient' && doctor_id !== undefined) {
      if (doctor_id === null || doctor_id === '') {
        push('doctor_id', null);
      } else {
        const doc = await pool.query("SELECT id FROM users WHERE id=$1 AND role='doctor'", [doctor_id]);
        if (!doc.rowCount) return res.status(400).json({ message: 'Assigned doctor not found.' });
        push('doctor_id', doctor_id);
      }
    }
    if (!updates.length) return res.status(400).json({ message: 'Nothing to update.' });
    values.push(existing.id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id=$${values.length} RETURNING id, name, email, role`,
      values
    );
    await logActivity({ userId: req.user.id, actorEmail: req.user.email, action: 'user_updated', entity: existing.role, entityId: existing.id, details: `Updated ${existing.role} ${existing.name}` });
    res.json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid user id.' });
    const target = await pool.query('SELECT id, name, email, role FROM users WHERE id=$1', [req.params.id]);
    const existing = target.rows[0];
    if (!existing) return res.status(404).json({ message: 'User not found.' });
    if (existing.role === 'admin') return res.status(403).json({ message: 'Admin accounts cannot be deleted.' });
    if (existing.id === req.user.id) return res.status(403).json({ message: 'You cannot delete your own account.' });
    await pool.query('DELETE FROM users WHERE id=$1', [existing.id]);
    await logActivity({ userId: req.user.id, actorEmail: req.user.email, action: 'user_deleted', entity: existing.role, entityId: existing.id, details: `Deleted ${existing.role} ${existing.name} <${existing.email}>` });
    res.json({ message: 'User deleted successfully.' });
  } catch (error) { next(error); }
});

router.get('/activity', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '200', 10), 1), 500);
    const result = await pool.query(
      `SELECT l.id, l.action, l.entity, l.entity_id, l.details, l.actor_email, l.created_at::text AS created_at,
              u.name AS actor_name
       FROM activity_logs l LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ activity: result.rows });
  } catch (error) { next(error); }
});

export default router;
