import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    registrationOpeningDate: Date,
    registrationClosingDate: Date,
    confirmationDate: Date,
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "timestamp" } },
);

const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

export default Settings;
