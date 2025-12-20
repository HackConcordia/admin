import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    isAdmitted: { type: Boolean, default: false },
  },
  { _id: false },
);

const teamsSchema = new mongoose.Schema({
  teamName: { type: String, default: "", unique: true },
  teamCode: { type: String, default: "", unique: true },
  members: {
    type: [MemberSchema], // This is now a flat array of MemberSchema objects
    default: [],
  },
  teamOwner: { type: String, default: "", unique: true },
});

const Team = mongoose.models.Team || mongoose.model("Team", teamsSchema);

export default Team;
