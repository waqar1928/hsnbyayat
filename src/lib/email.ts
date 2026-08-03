// Email abstraction, mirroring the pattern in storage.ts: a working default
// with zero setup (logs to the server console) plus a one-config-block swap
// to real delivery once SMTP credentials are supplied.
//
// Without SMTP_HOST set, transactional emails (password reset, etc.) are
// printed to the server console instead of sent — fine for local dev, NOT
// fine for production. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/
// SMTP_FROM in .env to send real email (any standard SMTP provider — SES,
// Postmark, Resend's SMTP endpoint, Mailgun, your own mail server, etc.).

export type SendEmailInput = { to: string; subject: string; html: string; text: string };

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!process.env.SMTP_HOST) {
    console.log(
      `\n[email:dev-fallback] SMTP_HOST not set — printing instead of sending.\n` +
        `To: ${input.to}\nSubject: ${input.subject}\n\n${input.text}\n`
    );
    return;
  }

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM || "no-reply@example.com",
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
