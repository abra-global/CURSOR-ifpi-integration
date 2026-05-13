import nodemailer from "nodemailer";
import { env } from "../config/env";

export interface IntegrationAlertPayload {
  subject: string;
  text: string;
}

export async function sendIntegrationAlert(payload: IntegrationAlertPayload): Promise<void> {
  const to = env.alerts.emailTo.trim();
  const smtpUser = env.alerts.smtp.user.trim();
  const smtpPassword = env.alerts.smtp.pass.trim();
  const smtpHost = env.alerts.smtp.host.trim();

  console.error("[Alert]", payload.subject, payload.text);

  if (!smtpUser || !smtpPassword) {
    console.log("[Alert Service] Email alerts are disabled: Missing SMTP credentials.");
    return;
  }

  if (!to || !smtpHost) {
    console.log("[Alert Service] Email alerts are disabled: Missing ALERT_EMAIL_TO or SMTP_HOST.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: env.alerts.smtp.port,
    secure: env.alerts.smtp.secure,
    auth: {
      user: smtpUser,
      pass: smtpPassword
    }
  });

  await transporter.sendMail({
    from: env.alerts.from.trim() || smtpUser,
    to,
    subject: payload.subject,
    text: payload.text
  });
}
