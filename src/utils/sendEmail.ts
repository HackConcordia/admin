/**
 * Sends one email of the shared kit (src/emails, a copy of the registration app's kit) through
 * SendGrid, with an HTML and a plain-text part. Same signature as the registration app's
 * lib/email/sendEmail.ts (design spec 3.4).
 *
 * - No SENDGRID_API_KEY (local and preview): the email is still rendered (so a broken link fails
 *   here too) and only logged as "[Email Stub]".
 * - From SENDGRID_FROM_EMAIL, reply-to CONTACT_EMAIL, both named "HackConcordia".
 *   CONTACT_EMAIL must equal the kit's CONTACT_EMAIL (src/emails/kit/brand.ts, shown in the email
 *   footer): team.hackconcordia@ecaconcordia.ca. The env mirrors the HackDécouverte admin, but the
 *   kit constant is not read here, so the two can drift apart.
 * - Never throws: returns false when rendering or sending fails. Logs the key, the language and
 *   the error's name/code only — never the address or the provider's message.
 */
import sgMail from "@sendgrid/mail";

import { EventConfigError, readContactEmail } from "@/config/event";
import { renderEmail } from "@/emails/render";
import type { EmailData, EmailKey, EmailLanguage } from "@/emails/types";
import { describeError } from "@/utils/describeError";

export const SENDER_NAME = "HackConcordia";

export interface SendEmailArgs<K extends EmailKey> {
  /** Recipient address. Never logged. */
  to: string;
  /** Ignored (always bilingual) for verifyAccount, resendVerification and passwordReset. */
  lang: EmailLanguage;
  data: EmailData[K];
}

/**
 * Throws an EventConfigError when a setting every real send needs is broken: CONTACT_EMAIL (the
 * reply-to) is not an email address, or SENDGRID_API_KEY is set without SENDGRID_FROM_EMAIL.
 * sendEmail itself never throws (it returns false), so a route that saves a decision calls this
 * before writing: a typo then refuses the change instead of saving it while every email quietly fails.
 */
export function assertEmailSettings(): void {
  readContactEmail(process.env);
  if (process.env.SENDGRID_API_KEY?.trim() && !process.env.SENDGRID_FROM_EMAIL?.trim()) {
    throw new EventConfigError("SENDGRID_FROM_EMAIL is not set");
  }
}

export async function sendEmail<K extends EmailKey>(key: K, { to, lang, data }: SendEmailArgs<K>): Promise<boolean> {
  if (typeof to !== "string" || to.trim() === "") {
    console.error(`[Email] ${key}: no recipient address; not sent`);
    return false;
  }
  try {
    const { subject, html, text } = await renderEmail(key, data, lang);

    const apiKey = process.env.SENDGRID_API_KEY?.trim();
    if (!apiKey) {
      // Subjects are fixed text (no user data), so logging one is safe.
      console.log(`[Email Stub] ${key} (${lang}): ${subject}`);
      return true;
    }
    const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();
    if (!fromEmail) {
      console.error(`[Email] SENDGRID_FROM_EMAIL is not set; the ${key} email was not sent`);
      return false;
    }

    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to: to.trim(),
      from: { email: fromEmail, name: SENDER_NAME },
      replyTo: { email: readContactEmail(process.env), name: SENDER_NAME },
      subject,
      text,
      html,
    });
    console.log(`[Email] Sent ${key} (${lang})`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send ${key} (${lang}):`, describeError(error));
    return false;
  }
}
