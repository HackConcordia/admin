export interface IUser {
  _id: string
  firstName: string
  lastName: string
  email: string
  password: string
  salt: string
  age: string | undefined
  resetPasswordToken: string
  resetPasswordExpires: Date
  createdAt: Date
  teamId: string
  gender?: string
  pronouns?: string
  phoneNumber: string | undefined
  verificationSentAt: Date
  verificationToken: string
}
