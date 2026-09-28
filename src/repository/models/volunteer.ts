import mongoose from "mongoose";

/**
 * Volunteer accounts for the event-checkin app. event-checkin owns this collection: the schema
 * mirrors event-checkin/repository/models/volunteers.ts field for field, and event-checkin builds
 * the indexes (its syncIndexes() would drop any index added here). So admin never syncs or builds
 * indexes and never creates the collection. versionKey is off so admin-created documents match the
 * ones event-checkin/scripts/create-volunteer.ts inserts (no __v). isSuperAdmin is written as false
 * for parity with that script; event-checkin decides super admins from SUPER_ADMIN_EMAILS instead.
 */
const volunteerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
  },
  { collection: "volunteers", autoIndex: false, autoCreate: false, versionKey: false },
);

const Volunteer = mongoose.models.Volunteers || mongoose.model("Volunteers", volunteerSchema);

export default Volunteer;
