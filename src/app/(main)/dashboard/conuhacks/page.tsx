"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { FileText, Users, Trophy, UserX, Shield, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IStats } from "@/interfaces/IStats";

import {
  WeeklyOverviewChart,
  TShirtDistribution,
  StatCard,
  TopSchools,
  DietaryChart,
  StatusOverview,
} from "../_components/stats";

export default function DashboardPage() {
  const [stats, setStats] = useState<IStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        const data = await response.json();

        if (data.status === "success") {
          setStats(data.data);
        } else {
          setError(data.message && "Failed to fetch statistics");
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
    return <DashboardSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Error Loading Dashboard</h3>
              <p className="text-muted-foreground text-sm">{error && "Unknown error occurred"}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const targetApplicants = 3000;
  const percentageOfTarget = ((stats.totalApplicants / targetApplicants) * 100).toFixed(2);

  // Calculate change percentage for new applicants
  const changePercentage =
    stats.newApplicants24To48Hours > 0 ? (stats.applicantsChange / stats.newApplicants24To48Hours) * 100 : 0;

  // Calculate total shirts from tshirtCounts
  const totalShirts = Object.values(stats.tshirtCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Applications Card - Hero */}
        <Card className="from-background to-muted/50 relative overflow-hidden bg-gradient-to-br lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Applications</CardTitle>
            <p className="text-muted-foreground text-sm">Number of applicants</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-primary text-4xl font-bold">{stats.totalApplicants.toLocaleString()}</p>
                <p className="text-muted-foreground mt-1 text-sm">{percentageOfTarget}% of target </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/dashboard/applications">
                    <Button size="sm">View Applications</Button>
                  </Link>
                  <Link href="/dashboard/conuhacks/advanced">
                    <Button size="sm" variant="outline">
                      <BarChart3 className="mr-1 h-4 w-4" />
                      Advanced Analytics
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex h-24 w-24 items-center justify-center">
                <Trophy className="h-20 w-20 text-amber-500" strokeWidth={1.5} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Overview Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusOverview statusCounts={stats.statusCounts} totalApplicants={stats.totalApplicants} />
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Overview */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyOverviewChart data={stats.last7DaysApplicants} weeklyTotal={stats.weeklyApplicants} />
          </CardContent>
        </Card>

        {/* T-Shirt Size Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-medium">T-Shirt Size Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <TShirtDistribution data={stats.tshirtCounts} totalShirts={totalShirts} />
          </CardContent>
        </Card>

        {/* Small Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="OAuth Users"
            value={`${stats.oauthUsersPercentage.toFixed(2)}%`}
            subtitle="SSO users"
            icon={Shield}
            iconColor="#22c55e"
            iconBgColor="rgba(34, 197, 94, 0.15)"
          />
          <StatCard
            title="Not Assigned"
            value={stats.unassignedApplications.toLocaleString()}
            subtitle="applications"
            icon={UserX}
            iconColor="#ef4444"
            iconBgColor="rgba(239, 68, 68, 0.15)"
          />
          <StatCard
            title="New Applicants"
            value={stats.newApplicantsLast24Hours}
            subtitle="Last 24 hrs"
            change={changePercentage}
            icon={FileText}
            iconColor="#22c55e"
            iconBgColor="rgba(34, 197, 94, 0.15)"
          />
          <StatCard
            title="Teams"
            value={stats.totalTeams.toLocaleString()}
            subtitle="Total Teams"
            icon={Users}
            iconColor="#3b82f6"
            iconBgColor="rgba(59, 130, 246, 0.15)"
          />
        </div>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Schools */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Top Schools</CardTitle>
          </CardHeader>
          <CardContent>
            <TopSchools schools={stats.topUniversities} />
          </CardContent>
        </Card>

        {/* Dietary Restrictions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Dietary Restriction</CardTitle>
          </CardHeader>
          <CardContent>
            <DietaryChart data={stats.dietaryRestrictionsData} />
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-muted-foreground py-4 text-center text-sm">
        © {new Date().getFullYear()}, Made with ❤️ by{" "}
        <a
          href="https://hackconcordia.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          HackConcordia
        </a>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48 lg:col-span-2" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[138px]" />
          <Skeleton className="h-[138px]" />
          <Skeleton className="h-[138px]" />
          <Skeleton className="h-[138px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-80" />
        <Skeleton className="h-80 lg:col-span-2" />
      </div>
    </div>
  );
}
