import dotenv from 'dotenv';
dotenv.config();
import { app } from './app.js';
import { notifyMissedSlots } from './services/notifications.js';

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Sweety API running at http://localhost:${port}`));

// Check for missed glucose slots every 15 minutes and email reminders.
const REMINDER_INTERVAL_MS = Number(process.env.REMINDER_INTERVAL_MINUTES || 15) * 60 * 1000;
setInterval(() => notifyMissedSlots().catch(e => console.error('Reminder job failed:', e.message)), REMINDER_INTERVAL_MS).unref();
setTimeout(() => notifyMissedSlots().catch(e => console.error('Reminder job failed:', e.message)), 30 * 1000).unref();
