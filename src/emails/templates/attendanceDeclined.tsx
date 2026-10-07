/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "attendanceDeclined" (organizers' copy).
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { AttendanceDeclinedData, TemplateCopy } from "../types";

export type { AttendanceDeclinedData };

export const copy: TemplateCopy<AttendanceDeclinedData> = {
  fr: {
    label: "PRÉSENCE",
    subject: () => "En espérant vous voir à un futur événement ConUHacks",
    preheader: () => "Merci de nous avoir informés de votre décision de ne pas participer à ConUHacks XI.",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>Merci de nous avoir informés de votre décision de ne pas participer à ConUHacks XI.</Paragraph>
        <Paragraph>
          {
            "Nous regrettons que vous ne puissiez pas vous joindre à nous cette fois-ci, mais nous apprécions sincèrement votre intérêt et espérons vous voir lors d'un prochain événement HackConcordia."
          }
        </Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "ATTENDANCE",
    subject: () => "Hope to see you at a future ConUHacks event",
    preheader: () => "Thank you for letting us know about your decision not to attend ConUHacks XI.",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>Thank you for letting us know about your decision not to attend ConUHacks XI.</Paragraph>
        <Paragraph>
          {
            "While we're sorry you won't be able to join us this time, we truly appreciate your interest and hope to see you at a future HackConcordia event."
          }
        </Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
