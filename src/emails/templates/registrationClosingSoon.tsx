/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "registration closing soon"
// (design: 2026-10-07-conuhacks-email-kit-and-reminders-design.md section 5.1). Shaped like templates/resendVerification.tsx.
// Sent 3 days before registrationClosingDate; it never names a date, on purpose (the deadline may move).
import { Button } from "../kit/Button";
import { ButtonRow } from "../kit/ButtonRow";
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { RegistrationClosingSoonData, TemplateCopy } from "../types";

export type { RegistrationClosingSoonData };

export const copy: TemplateCopy<RegistrationClosingSoonData> = {
  fr: {
    label: "CANDIDATURE",
    subject: () => "Dernière chance : les inscriptions à ConUHacks XI ferment bientôt",
    preheader: () => "Les inscriptions à ConUHacks XI ferment bientôt et votre candidature n'est pas encore soumise.",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>
          {"Les inscriptions à ConUHacks XI ferment bientôt et votre candidature n'est pas encore soumise."}
        </Paragraph>
        {"verifyUrl" in data ? (
          <>
            <Paragraph>{"Vérifiez d'abord votre courriel, puis remplissez votre candidature\u00a0:"}</Paragraph>
            <ButtonRow>
              <Button href={data.verifyUrl}>Vérifier mon courriel</Button>
            </ButtonRow>
          </>
        ) : (
          <>
            <Paragraph>{"Complétez-la dès maintenant pour ne pas manquer l'événement\u00a0:"}</Paragraph>
            <ButtonRow>
              <Button href={data.dashboardUrl}>Compléter ma candidature</Button>
            </ButtonRow>
          </>
        )}
        <Paragraph>{"Si vous n'êtes plus intéressé, vous pouvez ignorer ce courriel."}</Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "APPLICATION",
    subject: () => "Last chance: ConUHacks XI registration closes soon",
    preheader: () => "ConUHacks XI registration closes soon and your application isn't submitted yet.",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>{"ConUHacks XI registration closes soon and your application isn't submitted yet."}</Paragraph>
        {"verifyUrl" in data ? (
          <>
            <Paragraph>Verify your email first, then fill out your application:</Paragraph>
            <ButtonRow>
              <Button href={data.verifyUrl}>Verify my email</Button>
            </ButtonRow>
          </>
        ) : (
          <>
            <Paragraph>{"Finish it now so you don't miss the event:"}</Paragraph>
            <ButtonRow>
              <Button href={data.dashboardUrl}>Finish my application</Button>
            </ButtonRow>
          </>
        )}
        <Paragraph>{"If you're no longer interested, you can ignore this email."}</Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
