/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "teamJoinRequest".
// <joinerfullnameinbold> = Strong; buttons are Accept (primary) and My dashboard (secondary); decline lives on the dashboard.
// Shaped like templates/verifyAccount.tsx.
import { Button } from "../kit/Button";
import { ButtonRow } from "../kit/ButtonRow";
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph, Strong } from "../kit/Text";
import type { TeamJoinRequestData, TemplateCopy } from "../types";

export type { TeamJoinRequestData };

export const copy: TemplateCopy<TeamJoinRequestData> = {
  fr: {
    label: "ÉQUIPE",
    subject: () => "Admettre un participant dans votre équipe pour ConUHacks XI",
    preheader: (data) =>
      `Le participant suivant a demandé à rejoindre votre équipe pour ConUHacks XI\u00a0: ${data.joinerFullName}.`,
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>
          {"Le participant suivant a demandé à rejoindre votre équipe pour ConUHacks XI\u00a0: "}
          <Strong>{data.joinerFullName}</Strong>
          {". Vous pouvez accepter sa demande ci-dessous, ou l'approuver ou la refuser depuis votre tableau de bord. Une demande en attente occupe l'une des 4 places de votre équipe."}
        </Paragraph>
        <ButtonRow>
          <Button href={data.acceptUrl}>Accepter</Button>
          <Button href={data.dashboardUrl} variant="secondary">
            Mon tableau de bord
          </Button>
        </ButtonRow>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "TEAM",
    subject: () => "Admit a participant to your team for ConUHacks XI",
    preheader: (data) =>
      `The following participant has requested to join your team for ConUHacks XI: ${data.joinerFullName}.`,
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>
          {"The following participant has requested to join your team for ConUHacks XI: "}
          <Strong>{data.joinerFullName}</Strong>
          {". You can accept their request below, or approve or decline it from your dashboard. A pending request holds one of the 4 spots on your team."}
        </Paragraph>
        <ButtonRow>
          <Button href={data.acceptUrl}>Accept</Button>
          <Button href={data.dashboardUrl} variant="secondary">
            My dashboard
          </Button>
        </ButtonRow>
        <Signature lang="en" />
      </>
    ),
  },
};
