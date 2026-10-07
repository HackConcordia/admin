/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "application received FR" / "EN".
// Shaped like templates/verifyAccount.tsx.
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { ApplicationReceivedData, TemplateCopy } from "../types";

export type { ApplicationReceivedData };

export const copy: TemplateCopy<ApplicationReceivedData> = {
  fr: {
    label: "CANDIDATURE",
    subject: () => "Candidature reçue pour ConUHacks XI",
    preheader: () => "Merci d'avoir soumis votre candidature à ConUHacks XI\u00a0!",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>
          {
            "Merci d'avoir soumis votre candidature à ConUHacks XI\u00a0! Nous avons bien reçu votre dossier et nous l'examinerons sous peu."
          }
        </Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "APPLICATION",
    subject: () => "Application received for ConUHacks XI",
    preheader: () => "Thank you for submitting your application to ConUHacks XI!",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>
          Thank you for submitting your application to ConUHacks XI! We have received your application and we will
          review it shortly.
        </Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
