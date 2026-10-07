/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-03-email-copy.md, "you are now owner FR" / "EN".
// Spec section 4 addition: when join requests are pending, "Demandes en attente :" /
// "Pending join requests:" and one row per requester with an Accept button (its approval link),
// so those requests are not stranded. Shaped like templates/verifyAccount.tsx.
import { Button } from "../kit/Button";
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph, Strong, wrapAnywhere } from "../kit/Text";
import { colors, fonts, msoExact, text } from "../kit/theme";
import type { CopyLanguage, PendingJoinRequest, TeamNewOwnerData, TemplateCopy } from "../types";

export type { TeamNewOwnerData };

const firstSentence = {
  fr: (data: TeamNewOwnerData) =>
    `Le responsable de votre équipe ${data.teamName} pour ConUHacks XI a quitté l'équipe, vous en êtes donc maintenant le responsable.`,
  en: (data: TeamNewOwnerData) =>
    `The owner of your ConUHacks XI team ${data.teamName} has left, so you are now the owner.`,
};

const PENDING_TEXT: Record<CopyLanguage, { heading: string; accept: string }> = {
  fr: { heading: "Demandes en attente\u00a0:", accept: "Accepter" },
  en: { heading: "Pending join requests:", accept: "Accept" },
};

const ROW_BORDER = `2px solid ${colors.black}`;

/** One row per pending requester: the name in bold, its Accept button on the right. */
function PendingRequests({ lang, requests }: { lang: CopyLanguage; requests: readonly PendingJoinRequest[] }) {
  if (requests.length === 0) return null;
  const labels = PENDING_TEXT[lang];
  return (
    <>
      <Paragraph>{labels.heading}</Paragraph>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{ margin: "0 0 16px", borderBottom: ROW_BORDER }}
      >
        <tbody>
          {requests.map((request, index) => (
            <tr key={index}>
              <td
                valign="middle"
                style={{
                  borderTop: ROW_BORDER,
                  padding: "12px 12px 12px 0",
                  verticalAlign: "middle",
                  color: colors.ink,
                  fontFamily: fonts.body,
                  fontSize: text.fontSize,
                  lineHeight: text.lineHeight,
                  ...wrapAnywhere,
                  ...msoExact,
                }}
              >
                <Strong>{request.name}</Strong>
              </td>
              {/* 1% + nowrap: the button keeps its natural width and the name cell takes the rest. */}
              <td
                align="right"
                valign="middle"
                width="1%"
                style={{ borderTop: ROW_BORDER, padding: "12px 0", width: "1%", whiteSpace: "nowrap" }}
              >
                <Button href={request.approvalUrl} ariaLabel={`${labels.accept} ${request.name}`}>
                  {labels.accept}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export const copy: TemplateCopy<TeamNewOwnerData> = {
  fr: {
    label: "ÉQUIPE",
    subject: () => "Vous êtes maintenant le responsable de votre équipe pour ConUHacks XI",
    preheader: firstSentence.fr,
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>
          {`${firstSentence.fr(data)} N'hésitez pas à le contacter directement si vous pensez qu'il s'agit d'une erreur.`}
        </Paragraph>
        <PendingRequests lang="fr" requests={data.pendingRequests} />
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "TEAM",
    subject: () => "You are now the owner of your ConUHacks XI team",
    preheader: firstSentence.en,
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>
          {`${firstSentence.en(data)} Please reach out to them directly if you believe this was a mistake.`}
        </Paragraph>
        <PendingRequests lang="en" requests={data.pendingRequests} />
        <Signature lang="en" />
      </>
    ),
  },
};
