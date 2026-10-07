/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "admitted" (the organizers' copy,
// with the spec section 4 fix "Please confirm"). Attendance is confirmed on the
// dashboard, so there is one button. The event date comes from kit/brand.ts. The travel section
// follows the organizers' decision (spec 3.1) and is left out when data.travel is unset.
import { EVENT } from "../kit/brand";
import { Button } from "../kit/Button";
import { ButtonRow } from "../kit/ButtonRow";
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import { TextLink } from "../kit/TextLink";
import type { AdmittedData, CopyLanguage, TemplateCopy, TravelDecision } from "../types";

export type { AdmittedData };

const TRAVEL_TEXT = {
  fr: {
    approved: (amount: number, currency: string) =>
      `Remboursement des frais de déplacement : vous êtes admissible à un maximum de ${amount} ${currency}.`,
    guidelines: "Dépenses admissibles et marche à suivre : ",
    guidelinesLabel: "Directives concernant le remboursement des frais de déplacement",
    instructions: "Les instructions pour soumettre votre demande de remboursement suivront à l'approche de l'événement.",
    refused:
      "Nous avons reçu de nombreuses demandes de remboursement des frais de déplacement et, malheureusement, nous ne pouvons pas vous en offrir un cette fois-ci. Nous espérons tout de même vous voir à ConUHacks XI !",
  },
  en: {
    approved: (amount: number, currency: string) => `Travel reimbursement: you are approved for up to ${amount} ${currency}.`,
    guidelines: "Eligible expenses and how to claim them: ",
    guidelinesLabel: "Travel Reimbursement Guidelines",
    instructions: "Instructions to submit your reimbursement request will follow closer to the event.",
    refused:
      "We received many travel reimbursement requests and, unfortunately, we can't offer you a travel reimbursement this time. We still hope to see you at ConUHacks XI!",
  },
} as const;

function TravelSection({ lang, travel }: { lang: CopyLanguage; travel?: TravelDecision }) {
  if (!travel) return null;
  const t = TRAVEL_TEXT[lang];
  if (!travel.approved) return <Paragraph>{t.refused}</Paragraph>;
  const url = lang === "fr" ? (travel.guidelinesUrl.fr ?? travel.guidelinesUrl.en) : travel.guidelinesUrl.en;
  return (
    <>
      <Paragraph>{t.approved(travel.amount, travel.currency)}</Paragraph>
      {url ? (
        <Paragraph>
          {t.guidelines}
          <TextLink href={url}>{t.guidelinesLabel}</TextLink>
        </Paragraph>
      ) : null}
      <Paragraph>{t.instructions}</Paragraph>
    </>
  );
}

export const copy: TemplateCopy<AdmittedData> = {
  fr: {
    label: "ADMISSION",
    subject: () => "Vous avez été admis(e) à ConUHacks XI ! Veuillez confirmer votre présence",
    preheader: () => "Félicitations !",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>
          {`Félicitations ! Vous avez été admis(e) à ConUHacks XI le ${EVENT.date.fr}. Veuillez confirmer votre présence sur votre tableau de bord :`}
        </Paragraph>
        <ButtonRow>
          <Button href={data.dashboardUrl}>Confirmer ma présence</Button>
        </ButtonRow>
        <TravelSection lang="fr" travel={data.travel} />
        <Paragraph>Au plaisir de vous y voir&nbsp;!</Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "ADMISSION",
    subject: () => "You have been admitted to ConUHacks XI! Please confirm your attendance",
    preheader: () => "Congratulations!",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>
          {`Congratulations! You have been admitted to ConUHacks XI on ${EVENT.date.en}. Please confirm your attendance on your dashboard:`}
        </Paragraph>
        <ButtonRow>
          <Button href={data.dashboardUrl}>Confirm my attendance</Button>
        </ButtonRow>
        <TravelSection lang="en" travel={data.travel} />
        <Paragraph>We look forward to seeing you there!</Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
