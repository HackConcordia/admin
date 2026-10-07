/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Copy: docs/superpowers/specs/2026-10-03-email-copy.md, "password reset email"
// (with the spec section 4 fix "ignorer ce courriel"). Shaped like templates/verifyAccount.tsx.
import { Button } from "../kit/Button";
import { ButtonRow } from "../kit/ButtonRow";
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { PasswordResetData, TemplateCopy } from "../types";

export type { PasswordResetData };

export const copy: TemplateCopy<PasswordResetData> = {
  fr: {
    label: "COMPTE",
    subject: () => "Demande de réinitialisation de mot de passe",
    preheader: () => "Vous avez demandé la réinitialisation de votre mot de passe pour ConUHacks XI.",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.username} />
        <Paragraph>
          Vous avez demandé la réinitialisation de votre mot de passe pour ConUHacks XI. Veuillez réinitialiser
          votre mot de passe en cliquant ici&nbsp;:
        </Paragraph>
        <ButtonRow>
          <Button href={data.resetUrl}>Réinitialiser le mot de passe</Button>
        </ButtonRow>
        <Paragraph>
          {"Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer ce courriel en toute sécurité."}
        </Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "ACCOUNT",
    subject: () => "Password Reset Request",
    preheader: () => "You have requested to reset your password for ConUHacks XI.",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.username} />
        <Paragraph>
          You have requested to reset your password for ConUHacks XI. Please reset your password by clicking here:
        </Paragraph>
        <ButtonRow>
          <Button href={data.resetUrl}>Reset password</Button>
        </ButtonRow>
        <Paragraph>If you did not request a reset, you can safely ignore this email.</Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
