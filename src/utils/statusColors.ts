/**
 * Maps application status to their corresponding color codes
 */
export const STATUS_COLORS: Record<string, string> = {
  Unverified: "#171717",
  Incomplete: "crimson",
  Submitted: "darkblue",
  Admitted: "seagreen",
  Refused: "orangered",
  Waitlisted: "dimgray",
  "Not confirmed": "#590059",
  Confirmed: "darkgreen",
  Declined: "red",
  "Checked-In": "darkslategrey",
};

/**
 * Gets the color for a given status
 * @param status - The application status
 * @returns The color code for the status, or a default color if not found
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || "#6b7280"; // Default to gray-500 if status not found
}
