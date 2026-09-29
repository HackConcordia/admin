import mongoose from "mongoose";

/**
 * The event's singleton Settings document. The organizers edit it directly in MongoDB, so a date
 * may be an ISO string ("2027-01-20T23:59:00-05:00") or a Date: Mixed never raises a CastError,
 * and every reader goes through parseSettingsDate / formatSettingsDate.
 */
const settingsSchema = new mongoose.Schema(
  {
    registrationOpeningDate: mongoose.Schema.Types.Mixed,
    registrationClosingDate: mongoose.Schema.Types.Mixed,
    confirmationDate: mongoose.Schema.Types.Mixed,
    checkInOpeningDate: mongoose.Schema.Types.Mixed,
    checkInClosingDate: mongoose.Schema.Types.Mixed,
    maxCapacity: Number,
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "timestamp" } },
);

const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

export default Settings;
