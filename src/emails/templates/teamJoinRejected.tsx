/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "team join request rejected FR" / "EN".
// Shaped like templates/verifyAccount.tsx.
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { TeamJoinRejectedData, TemplateCopy } from "../types";

export type { TeamJoinRejectedData };

const firstSentence = {
  fr: (data: TeamJoinRejectedData) =>
    `Votre demande pour rejoindre l'équipe ${data.teamName} pour ConUHacks XI a été refusée par le responsable de l'équipe.`,
  en: (data: TeamJoinRejectedData) =>
    `Your request to join team ${data.teamName} for ConUHacks XI was rejected by the team owner.`,
};

export const copy: TemplateCopy<TeamJoinRejectedData> = {
  fr: {
    label: "ÉQUIPE",
    subject: () => "Votre demande pour rejoindre une équipe pour ConUHacks XI a été refusée",
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
    subject: () => "Your request to join a team for ConUHacks XI was denied",
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
