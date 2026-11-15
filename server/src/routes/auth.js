import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users(name, email, password_hash) VALUES($1, $2, $3) RETURNING id, name, email, role',
      [name.trim(), normalizedEmail, passwordHash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
    await logActivity({ userId: user.id, actorEmail: user.email, action: 'register', entity: 'user', entityId: user.id, details: `Registered account for ${user.name}` });
    return res.status(201).json({ user, token });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const result = await pool.query('SELECT id, name, email, role, password_hash FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
    await logActivity({ userId: user.id, actorEmail: user.email, action: 'login', entity: 'user', entityId: user.id, details: `${user.role} login` });
    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (error) { next(error); }
});

router.post('/logout', requireAuth, async (req, res) => {
  await logActivity({ userId: req.user.id, actorEmail: req.user.email, action: 'logout', entity: 'user', entityId: req.user.id });
  res.json({ message: 'Logged out successfully.' });
});


export default router;
