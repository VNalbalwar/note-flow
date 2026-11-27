import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

let transporter: Transporter | undefined;

export function mailConfigured() {
  return Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
}

function transport() {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST ?? "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  return transporter;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export type Mail = { to: string; subject: string; intro: string; action: string; url: string; footer: string };

/**
 * Sends one action email. Without SMTP settings, development prints the link
 * to the terminal; production refuses, so links never end up in server logs.
 */
export async function sendMail(mail: Mail) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email is not configured: set SMTP_USER and SMTP_PASSWORD.");
    }
    console.log(`\n[huddle mail] to ${mail.to}\n[huddle mail] ${mail.subject}\n[huddle mail] ${mail.url}\n`);
    return;
  }

  await transport().sendMail({
    from: `Huddle <${env.SMTP_USER}>`,
    to: mail.to,
    subject: mail.subject,
    text: `${mail.intro}\n\n${mail.action}: ${mail.url}\n\n${mail.footer}`,
    html: `<div style="font-family:system-ui,sans-serif;color:#14241a;max-width:30rem;margin:auto;padding:24px">
<p style="font-size:22px;font-weight:700;margin:0 0 16px">huddle</p>
<p style="line-height:1.6">${escapeHtml(mail.intro)}</p>
<p style="margin:24px 0"><a href="${escapeHtml(mail.url)}" style="background:#1c6b41;color:#fff;padding:12px 22px;border-radius:5px 999px 999px 999px;text-decoration:none;font-weight:600">${escapeHtml(mail.action)}</a></p>
<p style="font-size:13px;color:#566b59;line-height:1.6">${escapeHtml(mail.footer)}</p></div>`,
  });
}
