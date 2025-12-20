"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IAdvancedStats } from "@/interfaces/IAdvancedStats";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  GraduationCap,
  Globe,
  Briefcase,
  Languages,
  Plane,
  UserCheck,
  Building,
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#8b5cf6", "#06b6d4", "#eab308", "#ec4899", "#14b8a6", "#f43f5e"];

export default function AdvancedAnalyticsPage() {
  const [stats, setStats] = useState<IAdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats/advanced");
        const data = await response.json();

        if (data.status === "success") {
          setStats(data.data);
        } else {
          setError(data.message || "Failed to fetch statistics");
        }
      } catch {
        setError("Failed to connect to the server");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <AdvancedAnalyticsSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <h3 className="text-lg font-semibold">Error Loading Analytics</h3>
              <p className="text-muted-foreground text-sm">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/conuhacks">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Detailed insights from {stats.totalApplicants.toLocaleString()} applications
          </p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <QuickStatCard
          title="18+ Eligible"
          value={stats.ageEligibility.yes}
          total={stats.totalApplicants}
          icon={UserCheck}
          color="#22c55e"
        />
        <QuickStatCard
          title="Need Travel Reimbursement"
          value={stats.travelReimbursement.needed}
          total={stats.totalApplicants}
          icon={Plane}
          color="#f97316"
        />
        <QuickStatCard
          title="Co-op Registered"
          value={stats.coopStats.registered}
          total={stats.totalApplicants}
          icon={Briefcase}
          color="#3b82f6"
        />
        <QuickStatCard
          title="Countries"
          value={stats.countryDistribution.length}
          icon={Globe}
          color="#8b5cf6"
        />
      </div>

      {/* Row 1: Gender & Language */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Gender Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent data={stats.genderDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Languages className="h-5 w-5" />
              Preferred Language
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent data={stats.preferredLanguageDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Faculty & Level of Study */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5" />
              Faculty Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={stats.facultyDistribution.slice(0, 8)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5" />
              Level of Study
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={stats.levelOfStudyDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Programs & Graduation Year */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={stats.programDistribution.slice(0, 8)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Graduation Year</CardTitle>
          </CardHeader>
          <CardContent>
            <GraduationYearChart data={stats.graduationYearDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Job Types & Work Regions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5" />
              Job Types Interested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={stats.jobTypesDistribution.slice(0, 6)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5" />
              Preferred Work Regions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={stats.workRegionsDistribution.slice(0, 6)} />
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Countries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            Top Countries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {stats.countryDistribution.map((country, index) => (
              <div
                key={country.code}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span className="text-sm font-medium">{country.code}</span>
                <span className="text-muted-foreground text-sm">{country.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Quick Stat Card Component
function QuickStatCard({
  title,
  value,
  total,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  total?: number;
  icon: React.ElementType;
  color: string;
}) {
  const percentage = total ? ((value / total) * 100).toFixed(1) : null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{title}</p>
            <div className="flex items-baseline gap-1">
              <p className="text-xl font-bold">{value.toLocaleString()}</p>
              {percentage && (
                <span className="text-muted-foreground text-xs">({percentage}%)</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Pie Chart Component
function PieChartComponent({ data }: { data: { name: string; count: number }[] }) {
  const filteredData = data.filter((item) => item.count > 0);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1 space-y-2">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-3 w-3 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-muted-foreground flex-1 truncate text-sm">{item.name}</span>
            <span className="text-sm font-semibold">{item.count}</span>
          </div>
        ))}
      </div>
      <div className="h-[180px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="count"
              nameKey="name"
            >
              {filteredData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[data.findIndex((d) => d.name === entry.name) % COLORS.length]}
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

// Horizontal Bar Chart Component
function HorizontalBarChart({ data }: { data: { name: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.name} className="flex items-center gap-3" title={item.name}>
          <div className="text-muted-foreground w-36 truncate text-sm md:w-44">
            {item.name}
          </div>
          <div className="bg-muted h-6 flex-1 overflow-hidden rounded">
            <div
              className="h-full rounded transition-all duration-500"
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                backgroundColor: COLORS[index % COLORS.length],
              }}
            />
          </div>
          <div className="w-14 text-right text-sm font-semibold">{item.count}</div>
        </div>
      ))}
    </div>
  );
}

// Graduation Year Bar Chart
function GraduationYearChart({ data }: { data: { year: string; count: number }[] }) {
  const chartConfig = {
    count: {
      label: "Applicants",
      color: "#3b82f6",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ChartContainer>
  );
}

// Skeleton Loading Component
function AdvancedAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

