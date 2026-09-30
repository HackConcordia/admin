/**
 * ConUHacks XI decision emails: English first, then French. Pure; names are HTML-escaped.
 */
import type { EmailEventConfig } from "@/config/event";

export interface EmailRecipient {
  firstName?: string | null;
  lastName?: string | null;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

type Paragraph = string | { before: string; href: string; after?: string; label?: string };

interface Letter {
  greeting: string;
  paragraphs: readonly Paragraph[];
  closing: string;
  signature: string;
}

const BRAND = "HackConcordia";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphText(paragraph: Paragraph): string {
  return typeof paragraph === "string" ? paragraph : `${paragraph.before}${paragraph.href}${paragraph.after ?? ""}`;
}

function paragraphHtml(paragraph: Paragraph): string {
  if (typeof paragraph === "string") return `<p>${escapeHtml(paragraph)}</p>`;
  const href = escapeHtml(paragraph.href);
  return `<p>${escapeHtml(paragraph.before)}<a href="${href}">${paragraph.label ? escapeHtml(paragraph.label) : href}</a>${escapeHtml(paragraph.after ?? "")}</p>`;
}

function letterText(letter: Letter): string {
  return [letter.greeting, ...letter.paragraphs.map(paragraphText), `${letter.closing}\n${letter.signature}`].join("\n\n");
}

function letterHtml(letter: Letter): string {
  return [
    `<p>${escapeHtml(letter.greeting)}</p>`,
    ...letter.paragraphs.map(paragraphHtml),
    `<p>${escapeHtml(letter.closing)}<br/>${escapeHtml(letter.signature)}</p>`,
  ].join("\n");
}

function bilingual(subject: string, english: Letter, french: Letter): EmailContent {
  return {
    subject,
    text: `${letterText(english)}\n\n---\n\n${letterText(french)}`,
    html: `${letterHtml(english)}\n<hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">\n${letterHtml(french)}`,
  };
}

function greetings(recipient: EmailRecipient): { en: string; fr: string } {
  const name = `${recipient.firstName ?? ""} ${recipient.lastName ?? ""}`.trim();
  return { en: name ? `Hi ${name},` : "Hi,", fr: name ? `Bonjour ${name},` : "Bonjour," };
}

function contactLines(config: EmailEventConfig): { en: string; fr: string } {
  return {
    en: `Questions? Write to us at ${config.contactEmail} or reply to this email.`,
    fr: `Des questions ? Écrivez-nous à ${config.contactEmail} ou répondez à ce courriel.`,
  };
}

const SIGNATURE = { en: `The ${BRAND} team`, fr: `L'équipe ${BRAND}` };

/** The admin's travel reimbursement decision, as the status route passes it (never read by the registration app). */
export interface TravelDecisionSummary {
  approved: boolean;
  amount?: number;
  currency?: string;
}

const GUIDELINES_LABEL = {
  en: "Travel Reimbursement Guidelines",
  fr: "Directives concernant le remboursement des frais de déplacement",
};

function travelParagraphs(travel: TravelDecisionSummary | undefined, config: EmailEventConfig): { en: Paragraph[]; fr: Paragraph[] } {
  if (travel?.approved === true && travel.amount && travel.currency) {
    const frUrl = config.travelGuidelinesUrlFr ?? config.travelGuidelinesUrl;
    const en: Paragraph[] = [`Travel reimbursement: you are approved for up to ${travel.amount} ${travel.currency}.`];
    const fr: Paragraph[] = [
      `Remboursement des frais de déplacement : vous êtes admissible à un maximum de ${travel.amount} ${travel.currency}.`,
    ];
    if (config.travelGuidelinesUrl) {
      en.push({ before: "Eligible expenses and how to claim them: ", href: config.travelGuidelinesUrl, label: GUIDELINES_LABEL.en });
    }
    if (frUrl) fr.push({ before: "Dépenses admissibles et marche à suivre : ", href: frUrl, label: GUIDELINES_LABEL.fr });
    en.push("Instructions to submit your reimbursement request will follow closer to the event.");
    fr.push("Les instructions pour soumettre votre demande de remboursement suivront à l'approche de l'événement.");
    return { en, fr };
  }
  if (travel?.approved === false) {
    return {
      en: [
        `We received many travel reimbursement requests and, unfortunately, we can't offer you a travel reimbursement this time. We still hope to see you at ${config.eventName}!`,
      ],
      fr: [
        `Nous avons reçu de nombreuses demandes de remboursement des frais de déplacement et, malheureusement, nous ne pouvons pas vous en offrir un cette fois-ci. Nous espérons tout de même vous voir à ${config.eventName} !`,
      ],
    };
  }
  return { en: [], fr: [] };
}

export function admittedEmail(recipient: EmailRecipient, config: EmailEventConfig, travel?: TravelDecisionSummary): EmailContent {
  const hello = greetings(recipient);
  const contact = contactLines(config);
  const travelText = travelParagraphs(travel, config);
  return bilingual(
    `You're in! Confirm your spot at ${config.eventName} / Vous êtes admis(e) ! Confirmez votre place à ${config.eventName}`,
    {
      greeting: hello.en,
      paragraphs: [
        `Congratulations! You have been admitted to ${config.eventName}.`,
        { before: "Please confirm (or decline) your attendance on your dashboard as soon as possible: ", href: config.registrationUrl },
        ...travelText.en,
        `${config.eventName} takes place on ${config.eventDatesLabel} at ${config.venue}.`,
        contact.en,
      ],
      closing: "See you there,",
      signature: SIGNATURE.en,
    },
    {
      greeting: hello.fr,
      paragraphs: [
        `Félicitations ! Vous avez été admis(e) à ${config.eventName}.`,
        {
          before: "Veuillez confirmer (ou refuser) votre présence sur votre tableau de bord dès que possible : ",
          href: config.registrationUrl,
        },
        ...travelText.fr,
        `${config.eventName} aura lieu le ${config.eventDatesLabelFr} à ${config.venueFr}.`,
        contact.fr,
      ],
      closing: "À bientôt,",
      signature: SIGNATURE.fr,
    },
  );
}

function updateSubject(config: EmailEventConfig): string {
  return `${config.eventName} application update / Mise à jour de votre candidature à ${config.eventName}`;
}

export function waitlistedEmail(recipient: EmailRecipient, config: EmailEventConfig): EmailContent {
  const hello = greetings(recipient);
  const contact = contactLines(config);
  return bilingual(
    updateSubject(config),
    {
      greeting: hello.en,
      paragraphs: [
        `Thank you for applying to ${config.eventName}.`,
        "We received more applications than we have spots, so you have been placed on the waitlist.",
        "If a spot opens up, we will email you with instructions to confirm your attendance, so keep an eye on your inbox.",
        contact.en,
      ],
      closing: "Kind regards,",
      signature: SIGNATURE.en,
    },
    {
      greeting: hello.fr,
      paragraphs: [
        `Merci d'avoir posé votre candidature à ${config.eventName}.`,
        "Nous avons reçu plus de candidatures que de places disponibles : vous êtes sur la liste d'attente.",
        "Si une place se libère, nous vous écrirons avec les instructions pour confirmer votre présence. Surveillez votre boîte de réception.",
        contact.fr,
      ],
      closing: "Cordialement,",
      signature: SIGNATURE.fr,
    },
  );
}

export function refusedEmail(recipient: EmailRecipient, config: EmailEventConfig): EmailContent {
  const hello = greetings(recipient);
  const contact = contactLines(config);
  return bilingual(
    updateSubject(config),
    {
      greeting: hello.en,
      paragraphs: [
        `Thank you for applying to ${config.eventName}.`,
        "We received many applications this year and, unfortunately, we can't offer you a spot this time.",
        "This decision is not a reflection of your skills or potential. We hope to see you at a future HackConcordia event!",
        contact.en,
      ],
      closing: "Kind regards,",
      signature: SIGNATURE.en,
    },
    {
      greeting: hello.fr,
      paragraphs: [
        `Merci d'avoir posé votre candidature à ${config.eventName}.`,
        "Nous avons reçu de nombreuses candidatures cette année et, malheureusement, nous ne pouvons pas vous offrir de place cette fois-ci.",
        "Cette décision ne reflète en rien vos compétences ou votre potentiel. Nous espérons vous voir à un prochain événement HackConcordia !",
        contact.fr,
      ],
      closing: "Cordialement,",
      signature: SIGNATURE.fr,
    },
  );
}

export function discordInviteEmail(recipient: EmailRecipient, config: EmailEventConfig): EmailContent | null {
  if (!config.discordInviteUrl) return null;
  const hello = greetings(recipient);
  return bilingual(
    `Join the ${config.eventName} Discord server / Rejoignez le serveur Discord de ${config.eventName}`,
    {
      greeting: hello.en,
      paragraphs: [
        { before: `Welcome to ${config.eventName}! Join our Discord server for event updates and to find teammates: `, href: config.discordInviteUrl },
      ],
      closing: "See you soon,",
      signature: SIGNATURE.en,
    },
    {
      greeting: hello.fr,
      paragraphs: [
        {
          before: `Bienvenue à ${config.eventName} ! Rejoignez notre serveur Discord pour les nouvelles de l'événement et pour trouver des coéquipiers : `,
          href: config.discordInviteUrl,
        },
      ],
      closing: "À bientôt,",
      signature: SIGNATURE.fr,
    },
  );
}
