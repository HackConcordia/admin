import sgMail from "@sendgrid/mail";

import { getEventConfig } from "@/config/event";
import {
  admittedEmail,
  discordInviteEmail,
  refusedEmail,
  waitlistedEmail,
  type EmailContent,
  type TravelDecisionSummary,
} from "@/utils/admissionEmailContent";

const SENDER_NAME = "HackConcordia";

async function deliver(kind: string, to: string, content: EmailContent, replyTo: string): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey) {
    console.log(`[Email Stub] ${kind}: ${content.subject}`);
    return true;
  }
  if (!fromEmail) {
    console.error(`[Email] SENDGRID_FROM_EMAIL is not set; the ${kind} email was not sent`);
    return false;
  }

  try {
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to,
      from: { email: fromEmail, name: SENDER_NAME },
      replyTo: { email: replyTo, name: SENDER_NAME },
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    console.log(`[Email] Sent ${kind} email`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send ${kind} email:`, error instanceof Error ? error.name : "unknown error");
    return false;
  }
}

export async function sendAdmittedEmail(
  email: string,
  firstName: string,
  lastName: string,
  travel?: TravelDecisionSummary,
): Promise<boolean> {
  const config = getEventConfig();
  return deliver("admitted", email, admittedEmail({ firstName, lastName }, config, travel), config.contactEmail);
}

export async function sendWaitlistedEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  const config = getEventConfig();
  return deliver("waitlisted", email, waitlistedEmail({ firstName, lastName }, config), config.contactEmail);
}

export async function sendRefusedEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  const config = getEventConfig();
  return deliver("refused", email, refusedEmail({ firstName, lastName }, config), config.contactEmail);
}

export async function sendDiscordLink(email: string, firstName: string, lastName: string): Promise<boolean> {
  const config = getEventConfig();
  const content = discordInviteEmail({ firstName, lastName }, config);
  if (!content) {
    console.log("[Email] DISCORD_INVITE_URL is not set; skipping the Discord invite email");
    return true;
  }
  return deliver("discord-invite", email, content, config.contactEmail);
}
