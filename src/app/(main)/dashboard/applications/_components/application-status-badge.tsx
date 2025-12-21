import { Badge } from "@/components/ui/badge";
import {
    getStatusFillColor,
    getStatusStrokeColor,
} from "@/utils/statusColors";
import { CircleCheck } from "lucide-react";

export const ApplicationStatusBadge = ({ status }: { status: string }) => {
    const strokeColor = getStatusStrokeColor(status);
    const fillColor = getStatusFillColor(status);

    return (
        <Badge
            variant="outline"
            className="flex items-center gap-1 px-1.5 text-xs text-muted-foreground"
        >
            <CircleCheck
                className="h-3 w-3"
                style={{ stroke: strokeColor, fill: fillColor }}
            />
            {status}
        </Badge>)
};