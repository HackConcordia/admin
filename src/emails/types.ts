// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import type { ReactElement } from "react";

/** How an email is sent: one language, or French then English. */
export type EmailLanguage = "en" | "fr" | "bilingual";

/** A single language block's copy. */
export type CopyLanguage = "en" | "fr";

export const EMAIL_LANGUAGES: readonly EmailLanguage[] = ["en", "fr", "bilingual"];

// Every URL below is absolute https (or http://localhost in development) and built
// server-side by the sending app. Names are plain text; React escapes them.

/** Account emails: `username` is the account username, the OAuth display name, or absent. */
export interface VerifyAccountData {
  username?: string;
  verifyUrl: string;
}

export interface ResendVerificationData {
  username?: string;
  verifyUrl: string;
}

export interface PasswordResetData {
  username?: string;
  resetUrl: string;
}

/** `fullName` is "firstName lastName", trimmed by the sender; empty → "Hi," / "Bonjour,". */
export interface ApplicationReceivedData {
  fullName: string;
}

export interface TeamJoinRequestData {
  /** The team owner (recipient). */
  fullName: string;
  /** The applicant asking to join, shown in bold. */
  joinerFullName: string;
  acceptUrl: string;
  /** Owner's dashboard, where join requests can also be approved or declined. */
  dashboardUrl: string;
}

export interface TeamJoinRejectedData {
  fullName: string;
  teamName: string;
}

export interface TeamMemberRemovedData {
  fullName: string;
  teamName: string;
}

export interface PendingJoinRequest {
  name: string;
  approvalUrl: string;
}

export interface TeamNewOwnerData {
  fullName: string;
  teamName: string;
  /** Join requests still waiting for the (new) owner; empty → no "Pending join requests" list. */
  pendingRequests: PendingJoinRequest[];
}

/** The organizers' travel-reimbursement decision for one admitted applicant. */
export type TravelDecision =
  | { approved: true; amount: number; currency: string; guidelinesUrl: { en?: string; fr?: string } }
  | { approved: false };

export interface AdmittedData {
  fullName: string;
  dashboardUrl: string;
  /** Absent → the email says nothing about travel. */
  travel?: TravelDecision;
}

export interface AttendanceConfirmedData {
  fullName: string;
  /** Discord invite; absent → the Discord sentence is left out. */
  discordUrl?: string;
}

export interface AttendanceDeclinedData {
  fullName: string;
}

export interface AttendanceWithdrawnData {
  fullName: string;
}

export interface DiscordInviteData {
  fullName: string;
  discordUrl: string;
}

export interface WaitlistedData {
  fullName: string;
}

export interface RefusedData {
  fullName: string;
}

/** Reminder to an account whose email is still unverified (always bilingual). */
export interface VerifyReminderData {
  username?: string;
  verifyUrl: string;
}

/** Reminder to a verified account whose application is not submitted yet. */
export interface ApplicationReminderData {
  fullName: string;
  dashboardUrl: string;
}

/** Last call before the event: a verify button (unverified account) or a dashboard button. */
export type RegistrationClosingSoonData = { fullName?: string } & ({ verifyUrl: string } | { dashboardUrl: string });

/** Data each email key needs. Adding an email = one entry here + a template + a registry line. */
export interface EmailData {
  verifyAccount: VerifyAccountData;
  resendVerification: ResendVerificationData;
  passwordReset: PasswordResetData;
  applicationReceived: ApplicationReceivedData;
  teamJoinRequest: TeamJoinRequestData;
  teamJoinRejected: TeamJoinRejectedData;
  teamMemberRemoved: TeamMemberRemovedData;
  teamNewOwner: TeamNewOwnerData;
  admitted: AdmittedData;
  attendanceConfirmed: AttendanceConfirmedData;
  attendanceDeclined: AttendanceDeclinedData;
  attendanceWithdrawn: AttendanceWithdrawnData;
  discordInvite: DiscordInviteData;
  waitlisted: WaitlistedData;
  refused: RefusedData;
  verifyReminder: VerifyReminderData;
  applicationReminder: ApplicationReminderData;
  registrationClosingSoon: RegistrationClosingSoonData;
}

export type EmailKey = keyof EmailData;

/** One language's copy of a template (design spec 3.2). */
export interface LanguageCopy<D> {
  /** The small tag above the greeting, e.g. "COMPTE" / "ACCOUNT". */
  label: string;
  /** Fixed text only: no user data in subjects. */
  subject: (data: D) => string;
  /** Hidden inbox preview: the first sentence after the greeting. */
  preheader: (data: D) => string;
  /** Greeting … signature, built from kit parts. */
  Body: (props: { data: D }) => ReactElement;
}

export type TemplateCopy<D> = Record<CopyLanguage, LanguageCopy<D>>;

export interface RegistryEntry<D> {
  copy: TemplateCopy<D>;
  /** Sent before the applicant has chosen a language: always French then English. */
  alwaysBilingual: boolean;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}
