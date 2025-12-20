import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    salt: { type: String, required: true },
    age: { type: String, default: "" },
    teamId: { type: String, default: "" },
    gender: { type: String, default: "" },
    pronouns: { type: String, default: "" },
    processedBy: { type: String, default: "Not processed" },
    verificationToken: { type: String, default: "", unique: true },
    verificationSentAt: { type: Date, default: null },
    resetPasswordToken: { type: String, default: "", unique: true },
    resetPasswordExpires: { type: Date, default: null },
    isOAuthUser: { type: Boolean, default: false }, // Correctly defined field
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
