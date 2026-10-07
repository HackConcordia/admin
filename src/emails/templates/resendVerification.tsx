/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "resend verification email"
// (with the spec section 4 fix "ignorer ce courriel"). Shaped like templates/verifyAccount.tsx.
import { Button } from "../kit/Button";
import { ButtonRow } from "../kit/ButtonRow";
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { ResendVerificationData, TemplateCopy } from "../types";

export type { ResendVerificationData };

export const copy: TemplateCopy<ResendVerificationData> = {
  fr: {
    label: "COMPTE",
    subject: () => "Vérifiez votre compte pour ConUHacks XI",
    preheader: () => "Vous avez demandé un nouveau lien de vérification pour ConUHacks XI.",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.username} />
        <Paragraph>
          Vous avez demandé un nouveau lien de vérification pour ConUHacks XI. Veuillez vérifier votre adresse
          courriel en cliquant ici&nbsp;:
        </Paragraph>
        <ButtonRow>
          <Button href={data.verifyUrl}>Vérifier mon courriel</Button>
        </ButtonRow>
        <Paragraph>
          Si vous ne vous êtes pas inscrit à ConUHacks XI, vous pouvez ignorer ce courriel en toute sécurité.
        </Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "ACCOUNT",
    subject: () => "Verify your account for ConUHacks XI",
    preheader: () => "You have requested a new verification link for ConUHacks XI.",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.username} />
        <Paragraph>
          You have requested a new verification link for ConUHacks XI. Please verify your email address by clicking
          here:
        </Paragraph>
        <ButtonRow>
          <Button href={data.verifyUrl}>Verify my email</Button>
        </ButtonRow>
        <Paragraph>If you did not sign up for ConUHacks XI, you can safely ignore this email.</Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
