// Account emails (address verification, password reset) sent through Resend's HTTP API. Without a
// key outside production, the email is printed to the server log so sign-up works on a laptop.
import { dictionaries, matchLocale, type Locale } from "@/i18n/locales";

export type Email = { to: string; subject: string; text: string; html: string };

type Env = Partial<Record<"RESEND_API_KEY" | "EMAIL_FROM" | "NODE_ENV", string>>;

export async function sendEmail(email: Email, env: Env = process.env): Promise<void> {
  const key = env.RESEND_API_KEY?.trim();
  if (!key) {
    if (env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
    console.info(`[email] to ${email.to}: ${email.subject}\n${email.text}`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
  });
  if (!response.ok) throw new Error(`Resend answered ${response.status}: ${await response.text()}`);
}

/** The reader's language from the request that triggered the email (`Accept-Language`), English otherwise. */
export function emailLocale(request?: Request): Locale {
  const header = request?.headers.get("accept-language") ?? "";
  return matchLocale(header.split(",").map((part) => part.split(";")[0].trim()).filter(Boolean));
}

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export type AccountEmail = "verify" | "reset" | "existing";

/**
 * One short paragraph, one button, and the link again in plain text for mail apps that hide buttons.
 * Nothing the requester typed goes in: anyone can sign up with someone else's address.
 */
export function accountEmail(kind: AccountEmail, locale: Locale, to: string, url: string): Email {
  const d = dictionaries[locale];
  const subject = d[`email.${kind}.subject`];
  const body = d[`email.${kind}.body`];
  const button = d[`email.${kind}.button`];
  const ignore = d["email.ignore"];
  const text = `${body}\n\n${url}\n\n${ignore}`;
  const html = `<div style="font-family:system-ui,sans-serif;color:#2A1C1A;max-width:480px;line-height:1.5">
<p style="font-size:24px;font-weight:800;letter-spacing:-0.04em;margin:0 0 16px">artiko<span style="color:#C8553D">·</span></p>
<p>${escape(body)}</p>
<p><a href="${escape(url)}" style="display:inline-block;background:#2A1C1A;color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">${escape(button)}</a></p>
<p style="font-size:13px;color:#5E4A43">${escape(url)}</p>
<p style="font-size:13px;color:#5E4A43">${escape(ignore)}</p>
</div>`;
  return { to, subject, text, html };
}
