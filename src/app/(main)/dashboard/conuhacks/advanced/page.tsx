"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Building,
  ListChecks,
  Cake,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#eab308",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
];

interface AgeApplicant {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isEighteenOrAbove: string;
  status: string;
  school: string;
}

export default function AdvancedAnalyticsPage() {
  const [stats, setStats] = useState<IAdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ageDialogOpen, setAgeDialogOpen] = useState(false);

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
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
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
          <h1 className="text-2xl font-bold tracking-tight">
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground text-sm">
            Detailed insights from {stats.totalApplicants.toLocaleString()}{" "}
            applications
          </p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <QuickStatCard
          title="Travel Reimbursement (CAD)"
          value={stats.overallTravelReimbursement}
          secondaryValue={stats.confirmedTravelReimbursement}
          icon={Plane}
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

      {/* Admin Assignment Metrics */}
      {stats.adminAssignmentMetrics?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5" />
              Admin Assignment Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {stats.adminAssignmentMetrics.map((admin) => (
                <div
                  key={admin.email}
                  className="flex flex-col rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{admin.adminName}</div>
                    <span className="text-muted-foreground text-xs">
                      {admin.email}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      Assigned
                    </span>
                    <span className="font-semibold">
                      {admin.totalAssigned.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      Still Submitted
                    </span>
                    <span className="font-semibold">
                      {admin.submittedAssigned.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Age Distribution (Confirmed & Checked-in only) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cake className="h-5 w-5" />
                  Age Distribution
                </CardTitle>
                <p className="text-muted-foreground text-xs mt-1">
                  Confirmed &amp; Checked-in applicants only
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAgeDialogOpen(true)}
              >
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AgeDistributionChart data={stats.ageDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Age Distribution Dialog */}
      <AgeDistributionDialog
        open={ageDialogOpen}
        onOpenChange={setAgeDialogOpen}
      />

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
            {stats.jobTypesDistribution.length > 0 ? (
              <HorizontalBarChart
                data={stats.jobTypesDistribution.slice(0, 6)}
              />
            ) : (
              <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                No data available for job types
              </div>
            )}
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
            {stats.workRegionsDistribution.length > 0 ? (
              <HorizontalBarChart
                data={stats.workRegionsDistribution.slice(0, 6)}
              />
            ) : (
              <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                No data available for work regions
              </div>
            )}
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
                <span className="text-muted-foreground text-sm">
                  {country.count}
                </span>
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
  secondaryValue,
}: {
  title: string;
  value: number;
  total?: number;
  icon: React.ElementType;
  color: string;
  secondaryValue?: number;
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
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <p className="text-xl font-bold">
                  {title.includes("(CAD)")
                    ? new Intl.NumberFormat("en-CA", {
                        style: "currency",
                        currency: "CAD",
                      }).format(value)
                    : value.toLocaleString()}
                </p>
                {percentage && (
                  <span className="text-muted-foreground text-xs">
                    ({percentage}%)
                  </span>
                )}
              </div>
              {secondaryValue !== undefined && title.includes("(CAD)") && (
                <p className="text-muted-foreground text-xs">
                  Confirmed:{" "}
                  {new Intl.NumberFormat("en-CA", {
                    style: "currency",
                    currency: "CAD",
                  }).format(secondaryValue)}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Pie Chart Component
function PieChartComponent({
  data,
}: {
  data: { name: string; count: number }[];
}) {
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
            <span className="text-muted-foreground flex-1 truncate text-sm">
              {item.name}
            </span>
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
                  fill={
                    COLORS[
                      data.findIndex((d) => d.name === entry.name) %
                        COLORS.length
                    ]
                  }
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
function HorizontalBarChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div
          key={item.name}
          className="flex items-center gap-3"
          title={item.name}
        >
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
          <div className="w-14 text-right text-sm font-semibold">
            {item.count}
          </div>
        </div>
      ))}
    </div>
  );
}

// Age Distribution Donut Chart Component
function AgeDistributionChart({
  data,
}: {
  data: { eighteenOrAbove: number; underEighteen: number };
}) {
  const total = data.eighteenOrAbove + data.underEighteen;
  const chartData = [
    { name: "18 or Above", count: data.eighteenOrAbove },
    { name: "Under 18", count: data.underEighteen },
  ].filter((item) => item.count > 0);

  const AGE_COLORS = ["#22c55e", "#f97316"]; // Green for 18+, Orange for under 18

  if (total === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        No confirmed or checked-in applicants yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: AGE_COLORS[0] }}
          />
          <span className="text-muted-foreground flex-1 truncate text-sm">
            18 or Above
          </span>
          <span className="text-sm font-semibold">
            {data.eighteenOrAbove.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-xs">
            ({((data.eighteenOrAbove / total) * 100).toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: AGE_COLORS[1] }}
          />
          <span className="text-muted-foreground flex-1 truncate text-sm">
            Under 18
          </span>
          <span className="text-sm font-semibold">
            {data.underEighteen.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-xs">
            ({((data.underEighteen / total) * 100).toFixed(1)}%)
          </span>
        </div>
        <div className="border-muted mt-2 border-t pt-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="text-sm font-semibold">
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <div className="h-[180px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="count"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={AGE_COLORS[entry.name === "18 or Above" ? 0 : 1]}
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

// Graduation Year Bar Chart
function GraduationYearChart({
  data,
}: {
  data: { year: string; count: number }[];
}) {
  const chartConfig = {
    count: {
      label: "Applicants",
      color: "#3b82f6",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          className="stroke-muted"
        />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
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

// Age Distribution Dialog Component
function AgeDistributionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [applicants, setApplicants] = useState<AgeApplicant[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch applicants when dialog opens, tab changes, or search changes
  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.set("filter", activeTab);
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      
      const response = await fetch(`/api/stats/age-distribution?${params.toString()}`);
      const data = await response.json();
      
      if (data.status === "success") {
        setApplicants(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch applicants:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    if (open) {
      fetchApplicants();
    }
  }, [open, fetchApplicants]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setActiveTab("all");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5" />
            Age Distribution Details
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="below">Under 18</TabsTrigger>
            <TabsTrigger value="above">18 or Above</TabsTrigger>
          </TabsList>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 mt-4 min-h-0 overflow-hidden">
            <TabsContent value="all" className="h-full m-0">
              <ApplicantList applicants={applicants} loading={loading} />
            </TabsContent>
            <TabsContent value="below" className="h-full m-0">
              <ApplicantList applicants={applicants} loading={loading} />
            </TabsContent>
            <TabsContent value="above" className="h-full m-0">
              <ApplicantList applicants={applicants} loading={loading} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Applicant List Component
function ApplicantList({
  applicants,
  loading,
}: {
  applicants: AgeApplicant[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (applicants.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No applicants found
      </div>
    );
  }

  return (
    <div className="h-[400px] overflow-y-auto pr-2 space-y-2">
      {applicants.map((applicant) => (
        <div
          key={applicant._id}
          className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">
                {applicant.firstName} {applicant.lastName}
              </p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  applicant.isEighteenOrAbove === "yes"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                }`}
              >
                {applicant.isEighteenOrAbove === "yes" ? "18+" : "<18"}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  applicant.status === "Checked-in"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                }`}
              >
                {applicant.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {applicant.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {applicant.school}
            </p>
          </div>
          <Link
            href={`/dashboard/applications/${applicant._id}`}
            target="_blank"
            className="ml-2 p-2 hover:bg-muted rounded-md transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      ))}
    </div>
  );
}
