import mongoose from "mongoose";

const resumeMetadataSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    originalName: { type: String, default: "" },
    encoding: { type: String, default: "utf-8" },
    size: { type: Number, default: 0 },
    mimetype: { type: String, default: "" },
    url: { type: String, default: "" },
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
    firstName: { type: String, default: "", required: true },
    lastName: { type: String, default: "", required: true },
    isEighteenOrAbove: { type: String, default: "", required: true },
    phoneNumber: { type: String, default: "" },
    email: { type: String, default: "", required: true, unique: true },
    country: { type: String, default: "" },
    city: { type: String, default: "" },
    school: { type: String, default: "" },
    schoolOther: { type: String, default: "" },
    faculty: { type: String, default: "" },
    facultyOther: { type: String, default: "" },
    levelOfStudy: { type: String, default: "" },
    levelOfStudyOther: { type: String, default: "" },
    program: { type: String, default: "" },
    programOther: { type: String, default: "" },
    graduationSemester: { type: String, default: "" },
    graduationYear: { type: String, default: "" },
    coolProject: { type: String, default: "" },
    excitedAbout: { type: String, default: "" },
    travelReimbursement: { type: Boolean, default: false },
    preferredLanguage: { type: String, default: "" },
    workingLanguages: { type: String, default: "" },
    workingLanguagesOther: { type: String, default: "" },
    shirtSize: { type: String, default: "" },
    dietaryRestrictions: { type: [String], default: [] },
    dietaryRestrictionsDescription: { type: String, default: "" },
    resume: { type: resumeMetadataSchema, default: {} },
    github: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    gender: { type: String, default: "" },
    pronouns: { type: String, default: "" },
    underrepresented: { type: String, default: "" },
    jobRolesLookingFor: { type: String, default: "" },
    workRegions: { type: String, default: "" },
    workRegionsOther: { type: String, default: "" },
    jobTypesInterested: { type: String, default: "" },
    jobTypesInterestedOther: { type: String, default: "" },
    isRegisteredForCoop: { type: Boolean, default: false },
    nextCoopTerm: { type: String, default: "" },
    nextCoopTermOther: { type: String, default: "" },
    termsAndConditions: { type: conditionsSchema, default: {} },
    status: {
      type: String,
      default: "Unverified",
      enum: [
        "Unverified",
        "Incomplete",
        "Submitted",
        "Admitted",
        "Waitlisted",
        "Confirmed",
        "Declined",
        "CheckedIn",
        "Refused",
      ],
    },
    teamId: { type: String, default: "" },
    processedBy: { type: String, default: "Not processed" },
    processedAt: { type: Date, default: null },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const Application = mongoose.models.Applications || mongoose.model("Applications", applicationsSchema);

export default Application;
