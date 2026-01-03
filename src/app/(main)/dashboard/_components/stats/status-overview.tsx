"use client";

import { FileText, Clock, CheckCircle, UserCheck } from "lucide-react";

interface StatusOverviewProps {
  statusCounts: {
    Submitted: number;
    Admitted: number;
    Refused: number;
    Waitlisted: number;
    Declined: number;
    Confirmed: number;
    "Checked-in": number;
  };
  totalApplicants: number;
}

const statusConfig = [
  {
    key: "Submitted" as const,
    label: "Submitted",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    key: "Waitlisted" as const,
    label: "Waitlisted",
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    key: "Confirmed" as const,
    label: "Confirmed",
    icon: CheckCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    key: "Checked-in" as const,
    label: "Checked-In",
    icon: UserCheck,
    color: "text-violet-600",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
  },
];

export function StatusOverview({
  statusCounts,
  totalApplicants,
}: StatusOverviewProps) {
  const totalProcessedCount =
    (statusCounts.Admitted ?? 0) +
    (statusCounts.Refused ?? 0) +
    (statusCounts.Waitlisted ?? 0) +
    (statusCounts.Declined ?? 0) +
    (statusCounts.Confirmed ?? 0) +
    (statusCounts["Checked-in"] ?? 0);

  console.log(totalProcessedCount, totalApplicants);
  const processedPercentage =
    totalProcessedCount > 0
      ? ((totalProcessedCount / totalApplicants) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground text-sm">
        Processed{" "}
        <span className="text-foreground font-semibold">
          {processedPercentage}%
        </span>{" "}
        of submitted applications!
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statusConfig.map(({ key, label, icon: Icon, color, bgColor }) => (
          <div key={key} className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}
            >
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="text-lg font-semibold">
                {key === "Confirmed"
                  ? `${statusCounts[key] || 0}/${
                      (statusCounts["Admitted"] || 0) +
                      (statusCounts["Confirmed"] || 0)
                    }`
                  : statusCounts[key] || 0}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
