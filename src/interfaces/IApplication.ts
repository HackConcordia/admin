export interface IFile {
  id: string // File ID
  originalName: string
  encoding: string
  size: number
  mimetype: string
}

export interface IApplicationData {
  _id: string
  avatarSrc: string
  firstName?: string
  lastName?: string
  processedBy?: string
  name: string
  email: string
  status: string
}

export interface IApplication {
  _id: string
  firstName: string
  lastName: string
  age?: string
  phoneNumber?: string
  status: string
  email: string
  teamId: string | undefined
  isFromMontreal?: boolean
  country?: string
  city?: string | undefined
  school?: string
  discipline?: string
  shirtSize?: string
  dietaryRestrictions?: string
  dietaryRestrictionsDescription: string | undefined
  resume?: IFile | null
  hackathons?: number
  github?: string | undefined
  linkedin?: string | undefined
  termsAndConditions: {
    mlhConduct: boolean
    mlhEmails: boolean
    mlhTerms: boolean
  }
}
