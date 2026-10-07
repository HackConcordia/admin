/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "verify reminder"
// (design: docs/superpowers/specs/2026-10-07-conuhacks-email-kit-and-reminders-design.md section 5). Shaped like templates/resendVerification.tsx.
import { Button } from "../kit/Button";
import { ButtonRow } from "../kit/ButtonRow";
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { TemplateCopy, VerifyReminderData } from "../types";

export type { VerifyReminderData };

export const copy: TemplateCopy<VerifyReminderData> = {
  fr: {
    label: "COMPTE",
    subject: () => "Vérifiez votre courriel pour commencer votre candidature à ConUHacks XI",
    preheader: () =>
      "Vous avez créé un compte ConUHacks XI, mais votre adresse courriel n'est pas encore vérifiée.",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.username} />
        <Paragraph>
          {
            "Vous avez créé un compte ConUHacks XI, mais votre adresse courriel n'est pas encore vérifiée. Vérifiez-la pour pouvoir remplir votre candidature\u00a0:"
          }
        </Paragraph>
        <ButtonRow>
          <Button href={data.verifyUrl}>Vérifier mon courriel</Button>
        </ButtonRow>
        <Paragraph>
          {
            "Si vous ne vous êtes pas inscrit à ConUHacks XI ou si vous n'êtes plus intéressé, vous pouvez ignorer ce courriel."
          }
        </Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "ACCOUNT",
    subject: () => "Verify your email to start your ConUHacks XI application",
    preheader: () => "You created a ConUHacks XI account, but your email address isn't verified yet.",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.username} />
        <Paragraph>
          {
            "You created a ConUHacks XI account, but your email address isn't verified yet. Verify it so you can fill out your application:"
          }
        </Paragraph>
        <ButtonRow>
          <Button href={data.verifyUrl}>Verify my email</Button>
        </ButtonRow>
        <Paragraph>
          {"If you didn't sign up for ConUHacks XI or are no longer interested, you can ignore this email."}
        </Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
