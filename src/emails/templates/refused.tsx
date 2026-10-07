/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "rejected FR" / "rejected EN".
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { RefusedData, TemplateCopy } from "../types";

export type { RefusedData };

export const copy: TemplateCopy<RefusedData> = {
  fr: {
    label: "CANDIDATURE",
    subject: () => "Candidature non retenue pour ConUHacks XI",
    preheader: () =>
      "Nous avons le regret de vous informer que vous n'avez pas été sélectionné(e) pour ConUHacks XI.",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>
          {
            "Nous avons le regret de vous informer que vous n'avez pas été sélectionné(e) pour ConUHacks XI. Nous vous invitons à repostuler l'année prochaine si vous êtes éligible."
          }
        </Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "APPLICATION",
    subject: () => "You have been rejected for ConUHacks XI",
    preheader: () => "We regret to inform you that you were not chosen for ConUHacks XI.",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>
          We regret to inform you that you were not chosen for ConUHacks XI. We invite you to apply again next year
          if you are eligible.
        </Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
