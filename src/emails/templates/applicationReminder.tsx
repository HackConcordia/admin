/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-03-email-copy.md, "application reminder"
// (design: 2026-10-07-application-reminders-design.md section 7.2). Shaped like templates/resendVerification.tsx.
import { Button } from "../kit/Button";
import { ButtonRow } from "../kit/ButtonRow";
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { ApplicationReminderData, TemplateCopy } from "../types";

export type { ApplicationReminderData };

export const copy: TemplateCopy<ApplicationReminderData> = {
  fr: {
    label: "CANDIDATURE",
    subject: () => "Votre candidature à ConUHacks XI n'est pas encore soumise",
    preheader: () =>
      "Vous avez commencé votre inscription à ConUHacks XI, mais votre candidature n'est pas encore soumise.",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>
          {
            "Vous avez commencé votre inscription à ConUHacks XI, mais votre candidature n'est pas encore soumise. Il suffit de quelques minutes pour la compléter\u00a0:"
          }
        </Paragraph>
        <ButtonRow>
          <Button href={data.dashboardUrl}>Compléter ma candidature</Button>
        </ButtonRow>
        <Paragraph>{"Si vous n'êtes plus intéressé, vous pouvez ignorer ce courriel."}</Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "APPLICATION",
    subject: () => "Your ConUHacks XI application isn't submitted yet",
    preheader: () => "You started signing up for ConUHacks XI, but your application isn't submitted yet.",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>
          {
            "You started signing up for ConUHacks XI, but your application isn't submitted yet. It only takes a few minutes to finish:"
          }
        </Paragraph>
        <ButtonRow>
          <Button href={data.dashboardUrl}>Finish my application</Button>
        </ButtonRow>
        <Paragraph>{"If you're no longer interested, you can ignore this email."}</Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
