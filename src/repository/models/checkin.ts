import mongoose from 'mongoose'

const checkInSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  isCheckedIn: { type: Boolean, default: false }
})

const CheckIn = mongoose.models.CheckIn || mongoose.model('CheckIn', checkInSchema)

CheckIn.syncIndexes()

export default CheckIn
