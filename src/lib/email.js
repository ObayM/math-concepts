import nodemailer from 'nodemailer';

export async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        `[EMAIL] SMTP is not configured; refusing to send "${subject}" to ${to}. Set SMTP_* to enable delivery.`
      );
      throw new Error('Email delivery is not configured');
    }
    console.log(`\n[EMAIL - no SMTP configured]\nTo: ${to}\nSubject: ${subject}\n${html}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    // nodemailer waits 2 minutes to connect by default, and better-auth swallows
    // the eventual failure, so a black-holed host hangs signup for that long
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@mathly.com',
    to,
    subject,
    html,
  });
}
