export async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_HOST) {
    console.log(`\n[EMAIL — no SMTP configured]\nTo: ${to}\nSubject: ${subject}\n${html}\n`);
    return;
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@mathly.com",
    to,
    subject,
    html,
  });
}
