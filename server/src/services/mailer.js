import nodemailer from 'nodemailer';

const smtpUser = process.env.SMTP_USER || 'sweetyglucotracker@gmail.com';
const smtpPass = process.env.SMTP_PASS || '';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
});

export const mailConfigured = Boolean(smtpPass);
export const mailFrom = `Sweety Tracker <${smtpUser}>`;

export async function sendEmail({ to, subject, html }) {
  if (!mailConfigured) {
    console.log(`[mail:skipped] ${subject} -> ${to} (SMTP_PASS not configured)`);
    return false;
  }
  try {
    await transporter.sendMail({ from: mailFrom, to, subject, html });
    console.log(`[mail:sent] ${subject} -> ${to}`);
    return true;
  } catch (error) {
    console.error(`[mail:failed] ${subject} -> ${to}:`, error.message);
    return false;
  }
}
