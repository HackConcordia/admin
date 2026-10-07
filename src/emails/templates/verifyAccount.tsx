/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Reference template: copy this shape for every other email (pragma line included).
// Links built from data go through Button or kit/TextLink only (both reject non-https
// URLs); never react-email's Link, which would send a broken relative link as is.
// Copy: docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md, "please verify account email"
// (with the spec section 4 fix "ignorer ce courriel").
import { Button } from "../kit/Button";
import { ButtonRow } from "../kit/ButtonRow";
import { Signature } from "../kit/Signature";
import { Greeting, Paragraph } from "../kit/Text";
import type { TemplateCopy, VerifyAccountData } from "../types";

export type { VerifyAccountData };

export const copy: TemplateCopy<VerifyAccountData> = {
  fr: {
    label: "COMPTE",
    subject: () => "Vérifiez votre compte pour ConUHacks XI",
    preheader: () => "Bienvenue à ConUHacks XI\u00a0!",
    Body: ({ data }) => (
      <>
        <Greeting lang="fr" name={data.username} />
        <Paragraph>
          Bienvenue à ConUHacks XI&nbsp;! Veuillez vérifier votre adresse courriel en cliquant ici&nbsp;:
        </Paragraph>
        <ButtonRow>
          <Button href={data.verifyUrl}>Vérifier mon courriel</Button>
        </ButtonRow>
        <Paragraph>
          Si vous ne vous êtes pas inscrit à ConUHacks XI, vous pouvez ignorer ce courriel en toute sécurité.
        </Paragraph>
        <Paragraph>Nous sommes ravis de vous accueillir à ConUHacks XI&nbsp;!</Paragraph>
        <Signature lang="fr" />
      </>
    ),
  },
  en: {
    label: "ACCOUNT",
    subject: () => "Verify your account for ConUHacks XI",
    preheader: () => "Welcome to ConUHacks XI!",
    Body: ({ data }) => (
      <>
        <Greeting lang="en" name={data.username} />
        <Paragraph>Welcome to ConUHacks XI! Please verify your email address by clicking here:</Paragraph>
        <ButtonRow>
          <Button href={data.verifyUrl}>Verify my email</Button>
        </ButtonRow>
        <Paragraph>If you did not sign up for ConUHacks XI, you can safely ignore this email.</Paragraph>
        <Paragraph>We are excited to welcome you to ConUHacks XI!</Paragraph>
        <Signature lang="en" />
      </>
    ),
  },
};
