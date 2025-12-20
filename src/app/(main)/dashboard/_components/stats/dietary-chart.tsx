"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface DietaryChartProps {
  data: {
    restriction: string;
    count: number;
  }[];
}

const COLORS = [
  "#3b82f6", // Blue - None
  "#f97316", // Orange - Vegetarian
  "#22c55e", // Green - Vegan
  "#ef4444", // Red - Gluten Free
  "#8b5cf6", // Purple - Halal
  "#06b6d4", // Cyan - Kosher
  "#eab308", // Yellow - Nut Allergy
  "#78716c", // Stone - Dairy Free
  "#1f2937", // Gray - Other
];

// Fixed colors mapped to restriction names for consistency
const RESTRICTION_COLORS: Record<string, string> = {
  None: "#3b82f6",
  Vegetarian: "#f97316",
  Vegan: "#22c55e",
  "Gluten Free": "#ef4444",
  Halal: "#8b5cf6",
  Kosher: "#06b6d4",
  "Nut Allergy": "#eab308",
  "Dairy Free": "#78716c",
  Other: "#1f2937",
};

export function DietaryChart({ data }: DietaryChartProps) {
  const chartData = data.filter((item) => item.count > 0);

  const getColor = (restriction: string, index: number): string => {
    return RESTRICTION_COLORS[restriction] || COLORS[index % COLORS.length];
  };

  return (
    <div className="flex h-full flex-col gap-6 lg:flex-row">
      <div className="w-full flex-shrink-0 lg:w-1/2">
        <div className="max-h-[280px] space-y-2 overflow-y-auto pr-2">
          {data.map((item, index) => (
            <div key={item.restriction} className="flex items-center gap-3">
              <div
                className="h-3 w-3 flex-shrink-0 rounded-sm"
                style={{ backgroundColor: getColor(item.restriction, index) }}
              />
              <span className="text-muted-foreground flex-1 truncate text-sm">
                {item.restriction}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {item.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-[200px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="count"
              nameKey="restriction"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(
                    entry.restriction,
                    data.findIndex((d) => d.restriction === entry.restriction)
                  )}
                  strokeWidth={0}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background rounded-lg border px-3 py-2 shadow-lg">
                      <p className="text-sm font-medium">{payload[0].name}</p>
                      <p className="text-muted-foreground text-sm">
                        {payload[0].value?.toLocaleString()} applicants
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
