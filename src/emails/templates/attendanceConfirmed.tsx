/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "confirmed FR" / "confirmed EN".
// No arrival time until the organizers set one (spec 2.1); add EVENT.time and the clause back then.
// Date and venue come from kit/brand.ts; only the venue's street address (inside the
// parentheses) links to Google Maps (spec section 4). The Discord sentence is left out when
// data.discordUrl is unset.
import { EVENT } from "../kit/brand";
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import { TextLink } from "../kit/TextLink";
import type { AttendanceConfirmedData, TemplateCopy } from "../types";

export type { AttendanceConfirmedData };

export const copy: TemplateCopy<AttendanceConfirmedData> = {
  fr: {
    label: "CONFIRMÉ",
    subject: () => "Vous avez confirmé votre présence à ConUHacks XI",
    preheader: () => `Vous avez confirmé votre présence à ConUHacks XI le ${EVENT.date.fr}.`,
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>
          {`Vous avez confirmé votre présence à ConUHacks XI le ${EVENT.date.fr}. Veuillez vous présenter au ${EVENT.venue.fr.building} (`}
          <TextLink href={EVENT.mapsUrl}>{EVENT.venue.fr.address}</TextLink>
          {")."}
        </Paragraph>
        {data.discordUrl ? (
          <Paragraph>
            {"Veuillez rejoindre le Discord de ConUHacks XI en utilisant le lien suivant\u00a0: "}
            <TextLink href={data.discordUrl}>{data.discordUrl}</TextLink>
          </Paragraph>
        ) : null}
        <Paragraph>Bonne chance&nbsp;!</Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "CONFIRMED",
    subject: () => "You have confirmed your attendance for ConUHacks XI",
    preheader: () => `You have confirmed your attendance for ConUHacks XI on ${EVENT.date.en}.`,
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>
          {`You have confirmed your attendance for ConUHacks XI on ${EVENT.date.en}. Please arrive at ${EVENT.venue.en.building} (`}
          <TextLink href={EVENT.mapsUrl}>{EVENT.venue.en.address}</TextLink>
          {")."}
        </Paragraph>
        {data.discordUrl ? (
          <Paragraph>
            {"Please join the ConUHacks XI Discord using the following link: "}
            <TextLink href={data.discordUrl}>{data.discordUrl}</TextLink>
          </Paragraph>
        ) : null}
        <Paragraph>Good luck!</Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
