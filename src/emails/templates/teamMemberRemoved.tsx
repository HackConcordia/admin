/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-03-email-copy.md, "removed from team FR" / "EN"
// (with the spec section 4 fix: one space in "pour ConUHacks XI"). Shaped like templates/verifyAccount.tsx.
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { TeamMemberRemovedData, TemplateCopy } from "../types";

export type { TeamMemberRemovedData };

const firstSentence = {
  fr: (data: TeamMemberRemovedData) =>
    `Vous avez été retiré(e) de votre équipe ${data.teamName} pour ConUHacks XI par le responsable de l'équipe.`,
  en: (data: TeamMemberRemovedData) =>
    `You have been removed from your team ${data.teamName} for ConUHacks XI by the team owner.`,
};

export const copy: TemplateCopy<TeamMemberRemovedData> = {
  fr: {
    label: "ÉQUIPE",
    subject: () => "Vous avez été retiré(e) de votre équipe pour ConUHacks XI",
    preheader: firstSentence.fr,
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>
          {`${firstSentence.fr(data)} N'hésitez pas à le contacter directement si vous pensez qu'il s'agit d'une erreur.`}
        </Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "TEAM",
    subject: () => "You have been removed from your team for ConUHacks XI",
    preheader: firstSentence.en,
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>
          {`${firstSentence.en(data)} Please reach out to them directly if you believe this was a mistake.`}
        </Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
