"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface WeeklyOverviewChartProps {
  data: number[];
  weeklyTotal: number;
}

const chartConfig = {
  applicants: {
    label: "Applicants",
    color: "hsl(217, 91%, 60%)",
  },
} satisfies ChartConfig;

const getDayLabels = () => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay();
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const dayIndex = (today - i + 7) % 7;
    labels.push(days[dayIndex]);
  }
  return labels;
};

export function WeeklyOverviewChart({
  data,
  weeklyTotal,
}: WeeklyOverviewChartProps) {
  const dayLabels = getDayLabels();

  const chartData = data.map((value, index) => ({
    day: dayLabels[index],
    applicants: value,
  }));

  return (
    <div className="flex h-full flex-col">
      <ChartContainer
        config={chartConfig}
        className="min-h-[200px] w-full flex-1"
      >
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            className="stroke-muted"
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
          />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            content={<ChartTooltipContent />}
          />
          <Bar
            dataKey="applicants"
            fill="var(--color-applicants)"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ChartContainer>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-primary text-3xl font-bold">{weeklyTotal}</span>
        <span className="text-muted-foreground text-sm">
          We received{" "}
          <span className="text-foreground font-semibold">{weeklyTotal}</span>{" "}
          new applicants in the last 7 days! Keep up the great work!
        </span>
      </div>
    </div>
  );
}
