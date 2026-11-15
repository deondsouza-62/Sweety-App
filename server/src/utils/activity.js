import { pool } from '../db/pool.js';

export async function logActivity({ userId = null, actorEmail = null, action, entity = null, entityId = null, details = null }) {
  try {
    await pool.query(
      'INSERT INTO activity_logs(user_id, actor_email, action, entity, entity_id, details) VALUES($1,$2,$3,$4,$5,$6)',
      [userId, actorEmail, action, entity, entityId, details]
    );
  } catch (error) {
    console.error('Activity log failed:', error.message);
  }
}
