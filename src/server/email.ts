import 'server-only';

/**
 * Transactional email with two interchangeable backends:
 *
 * - **SMTP** (any mailbox: Gmail, GMX, Web.de, a provider's server). Sends from
 *   an address you already own, so it reaches any recipient without owning a
 *   domain. Preferred when SMTP_HOST is set.
 * - **Resend** over HTTP. No SMTP setup, but the sender must belong to a domain
 *   verified at Resend - otherwise delivery is limited to the account's own
 *   address.
 *
 * Everything degrades gracefully: with neither configured the app keeps working
 * and verification is simply not enforced (see `isEmailEnabled`), so a fresh
 * deployment can never lock itself out.
 */

// Overridable so the send path can be exercised against a local stub in tests.
const RESEND_ENDPOINT = process.env.RESEND_ENDPOINT ?? 'https://api.resend.com/emails';

export type EmailProvider = 'smtp' | 'resend' | null;

/** SMTP wins when both are configured - it reaches arbitrary recipients. */
export function emailProvider(): EmailProvider {
  if (!process.env.EMAIL_FROM) return null;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) return 'smtp';
  if (process.env.RESEND_API_KEY) return 'resend';
  return null;
}

export function isEmailEnabled(): boolean {
  return emailProvider() !== null;
}

/**
 * Names the variables still needed for the closest-to-complete configuration,
 * so a half-finished setup says what is missing instead of failing silently.
 */
export function missingEmailVars(): string[] {
  const missing: string[] = [];
  if (!process.env.EMAIL_FROM) missing.push('EMAIL_FROM');

  // Report against whichever backend the user started configuring.
  const startedSmtp = Boolean(
    process.env.SMTP_HOST || process.env.SMTP_USER || process.env.SMTP_PASSWORD,
  );
  if (startedSmtp) {
    if (!process.env.SMTP_HOST) missing.push('SMTP_HOST');
    if (!process.env.SMTP_USER) missing.push('SMTP_USER');
    if (!process.env.SMTP_PASSWORD) missing.push('SMTP_PASSWORD');
  } else if (!process.env.RESEND_API_KEY) {
    missing.push('RESEND_API_KEY (oder SMTP_HOST/SMTP_USER/SMTP_PASSWORD)');
  }
  return missing;
}

let warned = false;

/**
 * Says once per process why verification is off. Without this the feature just
 * silently stays disabled and a half-finished configuration looks like it
 * worked.
 */
export function warnIfEmailDisabled(): void {
  if (warned || isEmailEnabled()) return;
  warned = true;

  console.warn(
    `[email] Verification is DISABLED - missing ${missingEmailVars().join(', ')}. ` +
      'New accounts are usable immediately. Configure a provider and redeploy to require a code.',
  );
}

/** Address that receives a note whenever someone registers. */
export function adminEmail(): string | null {
  return process.env.ADMIN_EMAIL?.trim() || null;
}

interface SendResult {
  ok: boolean;
  error?: string;
  /** Short German explanation, safe to show a user. */
  hint?: string;
}

/**
 * Turns an SMTP failure into something actionable. Providers report these very
 * differently, so match on the response code and the message text.
 */
export function describeSmtpError(error: unknown): string {
  const err = error as { code?: string; responseCode?: number; message?: string; response?: string };
  const code = err?.code ?? '';
  const status = err?.responseCode ?? 0;
  const text = `${err?.response ?? ''} ${err?.message ?? ''}`.toLowerCase();

  if (code === 'EAUTH' || status === 535 || status === 534 || text.includes('authentication')) {
    return 'Anmeldung am Mailserver fehlgeschlagen - SMTP_USER oder SMTP_PASSWORD stimmen nicht.';
  }
  if (status === 550 || status === 553 || text.includes('sender') || text.includes('not valid')) {
    return 'Der Absender wurde abgelehnt - die Adresse aus EMAIL_FROM muss beim Anbieter als Absender verifiziert sein.';
  }
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EDNS') {
    return 'Mailserver nicht erreichbar - SMTP_HOST ist falsch geschrieben.';
  }
  if (code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION') {
    return 'Verbindung zum Mailserver fehlgeschlagen - meist ein falscher SMTP_PORT (587 oder 465).';
  }
  if (status === 554 || text.includes('spam') || text.includes('blocked')) {
    return 'Der Anbieter hat den Versand abgelehnt. Prüfe, ob dein Konto dort vollständig freigeschaltet ist.';
  }
  return 'Der Mailserver hat den Versand abgelehnt. Details stehen im Server-Log.';
}

interface Message {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send(params: Message): Promise<SendResult> {
  const provider = emailProvider();
  if (!provider) return { ok: false, error: 'email not configured' };
  return provider === 'smtp' ? sendViaSmtp(params) : sendViaResend(params);
}

/**
 * Sends through a normal mailbox. `SMTP_PORT` 465 means implicit TLS; anything
 * else (typically 587) upgrades via STARTTLS.
 */
async function sendViaSmtp(params: Message): Promise<SendResult> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM;
  if (!host || !user || !pass || !from) return { ok: false, error: 'smtp not configured' };

  const port = Number(process.env.SMTP_PORT ?? 587);

  try {
    // Imported lazily so the Resend path pulls in no SMTP code.
    const { createTransport } = await import('nodemailer');
    const transport = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });

    await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { ok: true };
  } catch (error) {
    const hint = describeSmtpError(error);
    console.error('[email] smtp send failed:', hint, error);
    return { ok: false, error: 'smtp', hint };
  }
}

/**
 * Opens a connection and authenticates without sending anything, so a
 * misconfiguration can be found without registering a throwaway account.
 */
export async function verifySmtpConnection(): Promise<{ ok: boolean; hint?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return { ok: false, hint: 'SMTP ist nicht vollständig konfiguriert.' };

  const port = Number(process.env.SMTP_PORT ?? 587);
  try {
    const { createTransport } = await import('nodemailer');
    await createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    }).verify();
    return { ok: true };
  } catch (error) {
    const hint = describeSmtpError(error);
    console.error('[email] smtp verify failed:', hint, error);
    return { ok: false, hint };
  }
}

async function sendViaResend(params: Message): Promise<SendResult> {
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
