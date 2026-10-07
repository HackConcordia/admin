// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import { copy as admitted } from "./templates/admitted";
import { copy as applicationReceived } from "./templates/applicationReceived";
import { copy as attendanceConfirmed } from "./templates/attendanceConfirmed";
import { copy as attendanceDeclined } from "./templates/attendanceDeclined";
import { copy as attendanceWithdrawn } from "./templates/attendanceWithdrawn";
import { copy as discordInvite } from "./templates/discordInvite";
import { copy as applicationReminder } from "./templates/applicationReminder";
import { copy as passwordReset } from "./templates/passwordReset";
import { copy as refused } from "./templates/refused";
import { copy as registrationClosingSoon } from "./templates/registrationClosingSoon";
import { copy as resendVerification } from "./templates/resendVerification";
import { copy as teamJoinRejected } from "./templates/teamJoinRejected";
import { copy as teamJoinRequest } from "./templates/teamJoinRequest";
import { copy as teamMemberRemoved } from "./templates/teamMemberRemoved";
import { copy as teamNewOwner } from "./templates/teamNewOwner";
import { copy as verifyAccount } from "./templates/verifyAccount";
import { copy as verifyReminder } from "./templates/verifyReminder";
import { copy as waitlisted } from "./templates/waitlisted";
import type { EmailData, EmailKey, RegistryEntry } from "./types";

export type EmailRegistry = { [K in EmailKey]: RegistryEntry<EmailData[K]> };

/** Every email the apps send. Account emails go out before we know the language: always bilingual. */
export const registry: EmailRegistry = {
  verifyAccount: { copy: verifyAccount, alwaysBilingual: true },
  resendVerification: { copy: resendVerification, alwaysBilingual: true },
  passwordReset: { copy: passwordReset, alwaysBilingual: true },
  applicationReceived: { copy: applicationReceived, alwaysBilingual: false },
  teamJoinRequest: { copy: teamJoinRequest, alwaysBilingual: false },
  teamJoinRejected: { copy: teamJoinRejected, alwaysBilingual: false },
  teamMemberRemoved: { copy: teamMemberRemoved, alwaysBilingual: false },
  teamNewOwner: { copy: teamNewOwner, alwaysBilingual: false },
  admitted: { copy: admitted, alwaysBilingual: false },
  attendanceConfirmed: { copy: attendanceConfirmed, alwaysBilingual: false },
  attendanceDeclined: { copy: attendanceDeclined, alwaysBilingual: false },
  attendanceWithdrawn: { copy: attendanceWithdrawn, alwaysBilingual: false },
  discordInvite: { copy: discordInvite, alwaysBilingual: false },
  waitlisted: { copy: waitlisted, alwaysBilingual: false },
  refused: { copy: refused, alwaysBilingual: false },
  // Reminders (lib/reminders/): an unverified account hasn't chosen a language yet.
  verifyReminder: { copy: verifyReminder, alwaysBilingual: true },
  applicationReminder: { copy: applicationReminder, alwaysBilingual: false },
  registrationClosingSoon: { copy: registrationClosingSoon, alwaysBilingual: false },
};

export const EMAIL_KEYS = Object.keys(registry) as EmailKey[];

export function registryEntry<K extends EmailKey>(key: K): RegistryEntry<EmailData[K]> {
  return registry[key];
}
