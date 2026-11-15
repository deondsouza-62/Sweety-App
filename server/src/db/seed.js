import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

const slots = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];
const samples = [108, 146, 132, 121];

try {
  const adminHash = await bcrypt.hash('SweetyAdmin123!', 12);
  await pool.query(
    `INSERT INTO users(name, email, password_hash, role, specialization)
     VALUES ($1, $2, $3, 'admin', 'Platform administration')
     ON CONFLICT(email) DO UPDATE SET name = EXCLUDED.name, role = 'admin'`,
    ['Platform Admin', 'admin@sweety.app', adminHash]
  );

  const doctorHash = await bcrypt.hash('SweetyDoctor123!', 12);
  const doctorResult = await pool.query(
    `INSERT INTO users(name, email, password_hash, role, specialization)
     VALUES ($1, $2, $3, 'doctor', $4)
     ON CONFLICT(email) DO UPDATE SET name = EXCLUDED.name, role = 'doctor'
     RETURNING id`,
    ['Dr. Ananya Rao', 'doctor@sweety.app', doctorHash, 'Endocrinology']
  );
  const doctorId = doctorResult.rows[0].id;

  const patients = [
    { name: 'Sweety Demo', email: 'demo@sweety.app', hash: await bcrypt.hash('SweetyDemo123!', 12) },
    { name: 'Priya Sharma', email: 'priya@sweety.app', hash: await bcrypt.hash('PriyaDemo123!', 12) }
  ];

  for (const patient of patients) {
    const userResult = await pool.query(
      `INSERT INTO users(name, email, password_hash, role, doctor_id)
       VALUES ($1, $2, $3, 'patient', $4)
       ON CONFLICT(email) DO UPDATE SET name = EXCLUDED.name, role = 'patient', doctor_id = EXCLUDED.doctor_id
       RETURNING id`,
      [patient.name, patient.email, patient.hash, doctorId]
    );
    const userId = userResult.rows[0].id;

    // Insert sample data for the last 6 days; skip existing slot/date rows.
    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const dateOnly = date.toISOString().slice(0, 10);
      for (let i = 0; i < slots.length; i++) {
        await pool.query(
          `INSERT INTO readings(user_id, reading_date, slot, value)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT(user_id, reading_date, slot) DO NOTHING`,
          [userId, dateOnly, slots[i], samples[i] + ((5 - offset) * 2) + i + (patient.email === 'priya@sweety.app' ? 8 : 0)]
        );
      }
    }
    console.log(`Patient ready: ${patient.email}`);
  }
  console.log('Admin ready: admin@sweety.app / SweetyAdmin123!');
  console.log('Doctor ready: doctor@sweety.app / SweetyDoctor123!');
} catch (error) {
  console.error('Seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
