import mongoose from 'mongoose'

const resumeMetadataSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    originalName: { type: String, default: '' },
    encoding: { type: String, default: 'utf-8' },
    size: { type: Number, default: 0 },
    mimetype: { type: String, default: '' }
  },
  { _id: false }
)

const conditionsSchema = new mongoose.Schema(
  {
    mlhConduct: { type: Boolean, default: false },
    mlhEmails: { type: Boolean, default: false },
    mlhTerms: { type: Boolean, default: false }
  },
  { _id: false }
)

const applicationsSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: '', required: true },
    lastName: { type: String, default: '', required: true },
    age: { type: String, default: '', required: true },
    phoneNumber: { type: String, default: '' },
    email: { type: String, default: '', required: true, unique: true },
    status: {
      type: String,
      default: 'Unverified',
      enum: ['Unverified', 'Incomplete', 'Submitted', 'Admitted', 'Waitlisted', 'Confirmed', 'Declined', 'CheckedIn', 'Refused']
    },
    processedBy: { type: String, default: 'Not processed' },
    processedAt: { type: Date, default: null },
    isFromMontreal: { type: Boolean, default: false },
    teamId: { type: String, default: '' },
    country: { type: String, default: '' },
    city: { type: String, default: '' },
    school: { type: String, default: '' },
    discipline: { type: String, default: '' },
    shirtSize: { type: String, default: '' },
    dietaryRestrictions: { type: [String], default: [] },
    dietaryRestrictionsDescription: { type: String, default: '' },
    resume: { type: resumeMetadataSchema, default: {} },
    hackathons: { type: Number, default: 0 },
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    termsAndConditions: { type: conditionsSchema, default: {} }
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  }
)

const Application = mongoose.models.Applications || mongoose.model('Applications', applicationsSchema)


export default Application
