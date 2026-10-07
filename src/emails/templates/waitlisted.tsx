/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-03-email-copy.md, "waitlisted FR" / "waitlisted EN"
// (with the spec section 4 fix "You will be admitted if a spot opens up. Stay tuned!").
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { TemplateCopy, WaitlistedData } from "../types";

export type { WaitlistedData };

export const copy: TemplateCopy<WaitlistedData> = {
  fr: {
    label: "LISTE D'ATTENTE",
    subject: () => "Vous avez été placé(e) sur la liste d'attente pour ConUHacks XI",
    preheader: () => "Vous avez été placé(e) sur la liste d'attente pour ConUHacks XI.",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>
          {
            "Vous avez été placé(e) sur la liste d'attente pour ConUHacks XI. Vous serez admis(e) si une place se libère, restez à l'affût\u00a0!"
          }
        </Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "WAITLIST",
    subject: () => "You have been waitlisted for ConUHacks XI",
    preheader: () => "You have been waitlisted for ConUHacks XI.",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>
          You have been waitlisted for ConUHacks XI. You will be admitted if a spot opens up. Stay tuned!
        </Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
