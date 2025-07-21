import mongoose from 'mongoose'

const mealDataSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
      required: true
    },
    taken: { type: Boolean, required: true }
  },
  { _id: false }
) // Disable _id for subdocuments

const mealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  meals: [mealDataSchema] // Array of meal data
})

const Meal = mongoose.models.Meal || mongoose.model('Meal', mealSchema)

export default Meal
