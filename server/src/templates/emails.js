const BRAND = '#259780';
const INK = '#203632';
const MUTED = '#7d8d87';

function layout({ preheader, title, bodyHtml }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f8f7;font-family:'DM Sans',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f8f7;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e9efed;">
  <tr><td style="background:linear-gradient(135deg,#1e786b,#164f4b);padding:28px 36px;">
    <span style="display:inline-block;width:34px;height:34px;border-radius:10px;background:#ffffff24;color:#fff;font-size:18px;line-height:34px;text-align:center;font-weight:700;">S</span>
    <span style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;margin-left:10px;vertical-align:middle;">sweety</span>
    <div style="color:#bce9d9;font-size:11px;letter-spacing:1.5px;margin-top:14px;">BLOOD GLUCOSE TRACKER</div>
  </td></tr>
  <tr><td style="padding:34px 36px 8px;">
    <h1 style="margin:0 0 6px;font-size:24px;color:${INK};letter-spacing:-0.5px;">${title}</h1>
    <div style="width:44px;height:3px;background:${BRAND};border-radius:2px;margin:14px 0 22px;"></div>
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:22px 36px 30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f8f5;border:1px solid #e2f0eb;border-radius:12px;">
      <tr><td style="padding:16px 18px;font-size:12px;color:#5d7268;line-height:1.7;">
        <b style="color:${BRAND};">A little more awareness goes a long way.</b><br/>
        This is an automated message from Sweety Tracker. Please do not reply to this email.
      </td></tr>
    </table>
  </td></tr>
</table>
<div style="text-align:center;color:#a5b0ab;font-size:10px;padding:18px 0 4px;">Made with care by Sweety · Your health journey, one reading at a time.</div>
</td></tr></table>
</body></html>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr><td style="background:${BRAND};border-radius:9px;">
  <a href="${href}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;">${label}</a>
</td></tr></table>`;
}

export function slotReminderEmail({ name, slotLabel, openTime }) {
  const subject = `Reminder: log your ${slotLabel.toLowerCase()} glucose reading`;
  const html = layout({
    preheader: `Your ${slotLabel.toLowerCase()} reading window is open — don't forget to log it.`,
    title: `Hi ${name}, don't miss your ${slotLabel.toLowerCase()} reading`,
    bodyHtml: `
      <p style="margin:0 0 14px;font-size:14px;color:${MUTED};line-height:1.7;">
        It looks like you haven't logged your <b style="color:${INK};">${slotLabel.toLowerCase()}</b> glucose reading yet.
        This slot opened at <b style="color:${INK};">${openTime}</b> — taking a moment now keeps your daily report complete.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f8f5;border-left:3px solid ${BRAND};border-radius:8px;">
        <tr><td style="padding:14px 16px;font-size:12px;color:#5d7268;line-height:1.7;">
          <b>Why it matters:</b> consistent readings help you and your care team spot patterns early. A complete day gives the most accurate daily, monthly and trend reports.
        </td></tr>
      </table>
      ${button(process.env.CLIENT_ORIGIN || 'http://localhost:5173', 'Log my reading now')}
      <p style="margin:18px 0 0;font-size:12px;color:${MUTED};">If you've already logged it, you can safely ignore this reminder.</p>`
  });
  return { subject, html };
}

export function glucoseAlertEmail({ doctorName, patientName, value, slotLabel, date, direction, low, high }) {
  const isHigh = direction === 'high';
  const accent = isHigh ? '#d58b62' : '#628bbd';
  const subject = `Alert: ${patientName}'s glucose is ${isHigh ? 'above' : 'below'} the healthy range`;
  const html = layout({
    preheader: `${patientName} recorded ${value} mg/dL (${slotLabel.toLowerCase()}, ${date}) — outside the ${low}–${high} mg/dL bandwidth.`,
    title: `${isHigh ? 'High' : 'Low'} glucose alert`,
    bodyHtml: `
      <p style="margin:0 0 14px;font-size:14px;color:${MUTED};line-height:1.7;">
        Hello Dr. ${doctorName}, one of your patients recorded a glucose value outside the expected bandwidth.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;border:1px solid #e9efed;border-radius:12px;">
        <tr><td style="padding:18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;font-size:12px;color:${MUTED};">PATIENT</td>
              <td align="right" style="padding:8px 0;font-size:13px;font-weight:700;color:${INK};">${patientName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:12px;color:${MUTED};">GLUCOSE VALUE</td>
              <td align="right" style="padding:8px 0;font-size:18px;font-weight:800;color:${accent};">${value} mg/dL</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:12px;color:${MUTED};">TIME SLOT</td>
              <td align="right" style="padding:8px 0;font-size:13px;font-weight:700;color:${INK};">${slotLabel}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:12px;color:${MUTED};">DATE</td>
              <td align="right" style="padding:8px 0;font-size:13px;font-weight:700;color:${INK};">${date}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:12px;color:${MUTED};">BANDWIDTH</td>
              <td align="right" style="padding:8px 0;font-size:13px;font-weight:700;color:${INK};">${low} – ${high} mg/dL</td>
            </tr>
          </table>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf3ec;border:1px solid #f0ddcb;border-radius:8px;">
        <tr><td style="padding:14px 16px;font-size:12px;color:#8a6a4d;line-height:1.7;">
          <b>Suggested next step:</b> review the patient's full report in your Sweety doctor portal and follow your clinical judgment. This alert is informational only and not medical advice.
        </td></tr>
      </table>
      ${button(process.env.CLIENT_ORIGIN || 'http://localhost:5173', 'Open doctor portal')}`
  });
  return { subject, html };
}
