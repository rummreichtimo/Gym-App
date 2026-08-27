import 'server-only';

/**
 * Transactional email via Resend's HTTP API - no SMTP setup and no extra
 * dependency, which keeps it working on serverless hosts.
 *
 * Everything here degrades gracefully: when no API key is configured the app
 * keeps working and email verification is simply not enforced
 * (see `isEmailEnabled`). That way a fresh deployment is never locked out.
 */

// Overridable so the send path can be exercised against a local stub in tests.
const RESEND_ENDPOINT = process.env.RESEND_ENDPOINT ?? 'https://api.resend.com/emails';

export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Address that receives a note whenever someone registers. */
export function adminEmail(): string | null {
  return process.env.ADMIN_EMAIL?.trim() || null;
}

interface SendResult {
  ok: boolean;
  error?: string;
}

async function send(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, error: 'email not configured' };

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('[email] send failed:', response.status, detail.slice(0, 300));
      return { ok: false, error: `${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    console.error('[email] send threw:', error);
    return { ok: false, error: 'network' };
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const BRAND = '#ff5c2e';

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="de"><body style="margin:0;padding:24px;background:#f4f5f7;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <tr><td style="padding:24px 28px;background:#0b0e14;">
      <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.02em;">IronPath</span>
    </td></tr>
    <tr><td style="padding:28px;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#12151c;">${title}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:18px 28px;background:#f4f5f7;color:#6a7385;font-size:12px;">
      Diese Nachricht wurde automatisch von IronPath verschickt.
    </td></tr>
  </table>
</body></html>`;
}

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  code: string;
}): Promise<SendResult> {
  const { to, name, code } = params;

  return send({
    to,
    subject: `${code} ist dein IronPath-Bestätigungscode`,
    text:
      `Hallo ${name},\n\n` +
      `dein Bestätigungscode für IronPath lautet: ${code}\n\n` +
      `Der Code ist 30 Minuten gültig.\n\n` +
      `Wenn du dich nicht registriert hast, kannst du diese E-Mail ignorieren.`,
    html: layout(
      `Hallo ${escapeHtml(name)}, bestätige deine E-Mail-Adresse`,
      `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#5a6375;">
         Gib diesen Code in der App ein, um dein Konto zu aktivieren:
       </p>
       <div style="margin:0 0 20px;padding:18px;background:#f4f5f7;border-radius:12px;text-align:center;">
         <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:${BRAND};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${code}</span>
       </div>
       <p style="margin:0;font-size:13px;line-height:1.6;color:#828b9d;">
         Der Code ist 30 Minuten gültig. Wenn du dich nicht registriert hast, ignoriere diese E-Mail einfach.
       </p>`,
    ),
  });
}

export async function sendNewUserNotification(params: {
  to: string;
  userName: string;
  userEmail: string;
  totalUsers: number;
}): Promise<SendResult> {
  const { to, userName, userEmail, totalUsers } = params;

  return send({
    to,
    subject: `Neue Registrierung bei IronPath: ${userName}`,
    text:
      `Ein neuer Nutzer hat sich registriert.\n\n` +
      `Name:  ${userName}\n` +
      `E-Mail: ${userEmail}\n` +
      `Nutzer insgesamt: ${totalUsers}\n`,
    html: layout(
      'Neue Registrierung',
      `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;color:#12151c;">
         <tr><td style="padding:6px 0;color:#828b9d;width:120px;">Name</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(userName)}</td></tr>
         <tr><td style="padding:6px 0;color:#828b9d;">E-Mail</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(userEmail)}</td></tr>
         <tr><td style="padding:6px 0;color:#828b9d;">Nutzer gesamt</td><td style="padding:6px 0;font-weight:600;">${totalUsers}</td></tr>
       </table>`,
    ),
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
