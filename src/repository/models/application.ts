import mongoose from "mongoose";

import {
  AGE_VALUES,
  COMMUNICATION_LANGUAGES,
  DISCIPLINES,
  MAX_HACKATHON_COUNT,
  SCHOOLING_LEVELS,
} from "@/lib/conuhacks/field-options";
import { APPLICATION_STATUSES } from "@/lib/status";

/**
 * The ConUHacks XI registration app owns the `applications` collection
 * (registration-website-conuhacks-10/my-app/lib/models/applicationSchema.ts). This schema mirrors
 * it field for field, with the same defaults and enums, and adds only the admin-side review fields.
 * The registration app builds the indexes and creates the collection, so this model does neither.
 */
const resumeMetadataSchema = new mongoose.Schema(
  {
    id: { type: String, default: null },
    originalName: { type: String, default: null },
    encoding: { type: String, default: "utf-8" },
    size: { type: Number, default: 0 },
    mimetype: { type: String, default: "" },
  },
  { _id: false },
);

const conditionsSchema = new mongoose.Schema(
  {
    mlhConduct: { type: Boolean, default: false },
    mlhEmails: { type: Boolean, default: false },
    mlhTerms: { type: Boolean, default: false },
  },
  { _id: false },
);

const applicationsSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    age: { type: String, default: "", enum: ["", ...AGE_VALUES] },
    phoneNumber: { type: String, default: "" },
    email: { type: String, default: "", required: true, unique: true },
    status: { type: String, default: "Unverified", enum: [...APPLICATION_STATUSES] },
    processedBy: { type: String, default: "Not processed" },
    processedAt: { type: Date, default: null },
    teamId: { type: String, default: "" },
    country: { type: String, default: "" },
    city: { type: String, default: "" },
    communicationLanguage: { type: String, default: "", enum: ["", ...COMMUNICATION_LANGUAGES] },
    // Multi-selects are stored the registration way: one JSON string in an array, ['["english"]'].
    languagesSpoken: { type: [String], default: [] },
    languagesSpokenOther: { type: String, default: "" },
    isStudentOrRecentGraduate: { type: Boolean, default: false },
    currentLevelOfSchooling: { type: String, default: "", enum: ["", ...SCHOOLING_LEVELS] },
    otherLevelOfSchooling: { type: String, default: "" },
    school: { type: String, default: "" },
    schoolOther: { type: String, default: "" },
    currentYear: { type: String, default: "" },
    degreeLength: { type: String, default: "" },
    degreeType: { type: String, default: "" },
    discipline: { type: String, default: "", enum: ["", ...DISCIPLINES] },
    disciplineOther: { type: String, default: "" },
    hackathons: { type: Number, default: null, min: 0, max: MAX_HACKATHON_COUNT },
    coolProject: { type: String, default: "" },
    excitedAbout: { type: String, default: "" },
    // null = not answered yet (the registration form requires yes/no while requests are open).
    travelReimbursement: { type: Boolean, default: null },
    shirtSize: { type: String, default: "" },
    dietaryRestrictions: { type: [String], default: [] },
    dietaryRestrictionsDescription: { type: String, default: "" },
    resume: { type: resumeMetadataSchema, default: {} },
    github: { type: String, default: null },
    linkedin: { type: String, default: null },
    gender: { type: String, default: null },
    pronouns: { type: String, default: null },
    underrepresented: { type: String, default: "" },
    isRegisteredForCoop: { type: Boolean, default: false },
    jobRolesLookingFor: { type: String, default: "" },
    jobTypesInterested: { type: [String], default: [] },
    jobTypesInterestedOther: { type: String, default: "" },
    termsAndConditions: { type: conditionsSchema, default: {} },
    // Admin-only fields: the registration app never declares, reads or accepts them.
    isTravelReimbursementApproved: { type: Boolean, required: false },
    travelReimbursementAmount: { type: Number, required: false },
    travelReimbursementCurrency: { type: String, required: false },
    comments: { type: String, required: false },
    skillTags: { type: [String], required: false },
    isStarred: { type: Boolean, default: false },
    // Written by event-checkin and the organizer check-in.
    checkedInAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    autoIndex: false,
    autoCreate: false,
  },
);

const Application = mongoose.models.Applications || mongoose.model("Applications", applicationsSchema);

export default Application;
