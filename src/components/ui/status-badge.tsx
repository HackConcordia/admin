import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/utils/statusColors";
import { cn } from "@/lib/utils";

interface StatusBadgeProps extends React.ComponentProps<typeof Badge> {
  status: string;
}

/**
 * A badge component that displays application status with color coding
 */
export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const backgroundColor = getStatusColor(status);

  // Determine if the background is dark to adjust text color
  const isDarkBackground = React.useMemo(() => {
    // Convert hex to RGB if needed
    let r: number, g: number, b: number;

    if (backgroundColor.startsWith("#")) {
      const hex = backgroundColor.replace("#", "");
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      // For named colors, we'll assume they're dark based on the color name
      const darkColors = [
        "darkblue",
        "darkgreen",
        "darkslategrey",
        "dimgray",
        "seagreen",
        "crimson",
        "orangered",
        "red",
      ];
      return darkColors.some((color) => backgroundColor.toLowerCase().includes(color)) || backgroundColor === "#171717" || backgroundColor === "#590059";
    }

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }, [backgroundColor]);

  return (
    <Badge
      className={cn(
        "border-transparent",
        isDarkBackground ? "text-white" : "text-black",
        className
      )}
      style={{ backgroundColor }}
      {...props}
    >
      {status}
    </Badge>
  );
}
