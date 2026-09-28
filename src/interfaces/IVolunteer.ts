/** A volunteer as the admin API returns it. The stored password (hash or legacy plaintext) is never included. */
export interface IVolunteer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** True when the stored password isn't a bcrypt hash, so the volunteer can't log in to event-checkin. */
  needsPasswordReset: boolean;
}

/** Returned once, by create and reset-password only. */
export interface IVolunteerCredentials extends IVolunteer {
  generatedPassword: string;
}
