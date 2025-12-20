"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  WeeklyOverviewChart,
  TShirtDistribution,
  StatCard,
  TopSchools,
  DietaryChart,
  StatusOverview,
} from "./_components/stats"
import {
  FileText,
  Users,
  Trophy,
  UserPlus,
  UserX,
  Shield,
} from "lucide-react"
import { IStats } from "@/interfaces/IStats"
import Link from "next/link"

export default function DashboardPage() {
  const [stats, setStats] = useState<IStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats")
        const data = await response.json()
        
        if (data.status === "success") {
          setStats(data.data)
        } else {
          setError(data.message || "Failed to fetch statistics")
        }
      } catch {
        setError("Failed to connect to the server")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto flex items-center justify-center">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Error Loading Dashboard</h3>
              <p className="text-sm text-muted-foreground">{error || "Unknown error occurred"}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const targetApplicants = 1000
  const percentageOfTarget = ((stats.totalApplicants / targetApplicants) * 100).toFixed(2)

  // Calculate change percentage for new applicants
  const changePercentage = stats.newApplicants24To48Hours > 0
    ? ((stats.applicantsChange / stats.newApplicants24To48Hours) * 100)
    : 0

  // Calculate total shirts from tshirtCounts
  const totalShirts = Object.values(stats.tshirtCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of ConUHacks X applications and statistics
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Applications Card - Hero */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-background to-muted/50 overflow-hidden relative">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Applications</CardTitle>
            <p className="text-sm text-muted-foreground">Number of applicants</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold text-primary">{stats.totalApplicants.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {percentageOfTarget}% of target 🚀
                </p>
                <Link href="/dashboard/applications">
                  <Button className="mt-4" size="sm">
                    View Applications
                  </Button>
                </Link>
              </div>
              <div className="h-24 w-24 flex items-center justify-center">
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
            <StatusOverview
              statusCounts={stats.statusCounts}
              totalApplicants={stats.totalApplicants}
            />
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Weekly Overview */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyOverviewChart
              data={stats.last7DaysApplicants}
              weeklyTotal={stats.weeklyApplicants}
            />
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
        <div className="grid gap-4 grid-cols-2">
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
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
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
      <div className="text-center text-sm text-muted-foreground py-4">
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
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72 mt-2" />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48 lg:col-span-2" />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
        <div className="grid gap-4 grid-cols-2">
          <Skeleton className="h-[138px]" />
          <Skeleton className="h-[138px]" />
          <Skeleton className="h-[138px]" />
          <Skeleton className="h-[138px]" />
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Skeleton className="h-80" />
        <Skeleton className="h-80 lg:col-span-2" />
      </div>
    </div>
  )
}
