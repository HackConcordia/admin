import type { IStatus } from "@/interfaces/IStatus";

export const statuses: IStatus[] = [
  {
    name: "Unverified",
    title: "Email Not Verified",
    description: "Your email address is not verified. Please verify your email to proceed.",
    backgroundColor: "#171717",
  },
  {
    name: "Incomplete",
    title: "Profile Incomplete",
    description: "Please fill the application form to complete your registration profile.",
    backgroundColor: "crimson",
  },
  {
    name: "Submitted",
    title: "Application Submitted",
    description: "Your application has been submitted and is awaiting review.",
    backgroundColor: "darkblue",
  },
  {
    name: "Admitted",
    title: "Admitted to Hackathon",
    description:
      "Congratulations! You have been admitted to the hackathon. Please confirm your attendance on the dashboard.",
    backgroundColor: "seagreen",
  },
  {
    name: "Refused",
    title: "Application Refused",
    description: "We regret to inform you that your application has been refused. Thank you for your interest.",
    backgroundColor: "orangered",
  },
  {
    name: "Waitlisted",
    title: "Application Waitlisted",
    description: "Your application has been waitlisted. You will be notified if a spot becomes available.",
    backgroundColor: "dimgray",
  },
  {
    name: "Not confirmed",
    title: "Attendance Not Confirmed",
    description:
      "You have not yet confirmed your attendance. Please confirm your attendance by clicking the attending button.",
    backgroundColor: "#590059",
  },
  {
    name: "Confirmed",
    title: "Attendance Confirmed",
    description: "You have confirmed your attendance. We look forward to seeing you at the hackathon!",
    backgroundColor: "darkgreen",
  },
  {
    name: "Declined",
    title: "Attendance Declined",
    description:
      "You have declined your attendance. We hope to see you in future events. If you are currently in a team please inform your team members.",
    backgroundColor: "red",
  },
  {
    name: "Checked-In",
    title: "Checked-In for Hackathon",
    description: "You have successfully checked in for the hackathon. Get ready for an exciting event!",
    backgroundColor: "darkslategrey",
  },
];
