/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "discordInvite" (current ConUHacks
// email). The old "contact us at …" sentence is dropped: the kit footer carries the contact address.
import { Button } from "../kit/Button";
import { ButtonRow } from "../kit/ButtonRow";
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { DiscordInviteData, TemplateCopy } from "../types";

export type { DiscordInviteData };

export const copy: TemplateCopy<DiscordInviteData> = {
  fr: {
    label: "DISCORD",
    subject: () => "Rejoignez le serveur Discord de ConUHacks XI",
    preheader: () => "Bienvenue à ConUHacks XI !",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.fullName} />
        <Paragraph>
          {
            "Bienvenue à ConUHacks XI ! Rejoignez notre serveur Discord pour les nouvelles de l'événement et pour trouver des coéquipiers :"
          }
        </Paragraph>
        <ButtonRow>
          <Button href={data.discordUrl}>Rejoindre le Discord</Button>
        </ButtonRow>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "DISCORD",
    subject: () => "Join the ConUHacks XI Discord server",
    preheader: () => "Welcome to ConUHacks XI!",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.fullName} />
        <Paragraph>Welcome to ConUHacks XI! Join our Discord server for event updates and to find teammates:</Paragraph>
        <ButtonRow>
          <Button href={data.discordUrl}>Join the Discord</Button>
        </ButtonRow>
        <Signature lang="en" />
      </>
    ),
  },
};
