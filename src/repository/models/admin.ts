import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  assignedApplications: { type: [String], default: [] },
  isSuperAdmin: { type: Boolean, default: false },
});

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);

Admin.syncIndexes();

export default Admin;
