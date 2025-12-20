import connectMongoDB from '@/repository/mongoose'

import { sendSuccessResponse, sendErrorResponse } from '@/repository/response'

import Application from '@/repository/models/application'

import Team from '@/repository/models/team'

import User from '@/repository/models/user' // Import the User model

import { statuses } from '@/constants/statuses'

// Utility function to format dietary restriction names
const formatDisplayName = (restriction: string) => {
  return restriction
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
};

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = async () => {
  try {
    await connectMongoDB()

    console.log('GET request received')

    // Fetch all applications, including dietaryRestrictions (as a string representation of array)
    const applications = await Application.find({}, 'status school shirtSize createdAt dietaryRestrictions processedBy')

    if (!applications) {
      return sendErrorResponse('No applications found', {}, 404)
    }

    // Fetch all teams
    const teams = await Team.find({})
    const totalTeams = teams.length

    // Fetch all users
    const users = await User.find({}, 'isOAuthUser');
    const totalUsers = users.length;

    // Calculate OAuth users
    const oauthUsers = await User.countDocuments({ isOAuthUser: true });
    const oauthUsersPercentage = totalUsers > 0 ? (oauthUsers / totalUsers) * 100 : 0;

    // Total applicants
    const totalApplicants = applications.length

    // unassigned applications count
    const unassignedApplications = applications.filter(a => a.processedBy === "Not processed").length;

    // Group by status
    const statusCounts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Add missing statuses with zero counts
    statuses.forEach(status => {
      if (!statusCounts[status.name]) {
        statusCounts[status.name] = 0
      }
    })

    // New applicants in the last 24 hours
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const newApplicantsLast24Hours = applications.filter(app => new Date(app.createdAt) > last24Hours).length

    // New applicants in the 24-48 hours range
    const last48Hours = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const newApplicants24To48Hours = applications.filter(app => new Date(app.createdAt) > last48Hours && new Date(app.createdAt) <= last24Hours).length

    // Calculate the change in new applicants between the last 24 hours and the 24-48 hour period
    const applicantsChange = newApplicantsLast24Hours - newApplicants24To48Hours

    // Weekly applicants
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weeklyApplicants = applications.filter(app => new Date(app.createdAt) > lastWeek).length

    // Applicants per day for the last 7 days
    const last7DaysApplicants = new Array(7).fill(0)
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000)
      const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayCount = applications.filter(app => {
        const appDate = new Date(app.createdAt)
        return appDate >= dayStart && appDate < dayEnd
      }).length
      last7DaysApplicants[6 - i] = dayCount
    }

    // Top 5 universities
    const universityCounts = applications.reduce((acc, app) => {
      if (app.school) acc[app.school] = (acc[app.school] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topUniversities = Object.entries(universityCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([university, count]) => ({ university, count }))

    // T-shirt size counts
    const tshirtCounts = applications.reduce((acc, app) => {
      if (app.shirtSize) acc[app.shirtSize] = (acc[app.shirtSize] || 0) + 1
      return acc
    }, { S: 0, M: 0, L: 0, XL: 0, XXL: 0 })

    // Dietary restriction counts
    let applicantsWithNoRestrictions = 0
    const dietaryRestrictionCounts = applications.reduce((acc, app) => {
      let restrictions: string[] = []

      // Parse dietaryRestrictions if available
      try {
        const rawRestrictions = app.dietaryRestrictions
        // Check if dietaryRestrictions exists, is an array, has items, and first item is valid JSON
        if (
          rawRestrictions && 
          Array.isArray(rawRestrictions) && 
          rawRestrictions.length > 0 && 
          rawRestrictions[0] && 
          rawRestrictions[0] !== 'undefined' &&
          typeof rawRestrictions[0] === 'string'
        ) {
          const parsed = JSON.parse(rawRestrictions[0])
          if (Array.isArray(parsed)) {
            restrictions = parsed
          }
        }
      } catch {
        // Silently handle parsing errors - these applicants will be counted as "no restrictions"
      }

      // Count applicants with no restrictions
      if (restrictions.length === 0) {
        applicantsWithNoRestrictions++
      }

      // Count each dietary restriction
      restrictions.forEach((restriction: string | number) => {
        acc[restriction] = (acc[restriction] || 0) + 1
      })

      return acc
    }, {} as Record<string, number>)

    // Map to ensure all dietary restrictions are included
    const dietaryRestrictions = [
      'vegetarian',
      'vegan',
      'glutenFree',
      'halal',
      'kosher',
      'nutAllergy',
      'dairyFree',
      'other',
    ]

    const dietaryRestrictionsData = [
      { restriction: 'None', count: applicantsWithNoRestrictions },
      ...dietaryRestrictions.map((restriction) => ({
        restriction: formatDisplayName(restriction), // Capitalized with spaces
        count: dietaryRestrictionCounts[restriction] || 0,
      }))
    ]

    // Response
    const responseData = {
      totalApplicants,
      statusCounts,
      newApplicantsLast24Hours,
      newApplicants24To48Hours,
      applicantsChange,
      weeklyApplicants,
      last7DaysApplicants,
      topUniversities,
      tshirtCounts,
      totalTeams,
      dietaryRestrictionsData,
      oauthUsersPercentage,
      unassignedApplications
    }
    return sendSuccessResponse('Applicant statistics retrieved successfully', responseData)
  } catch (error) {
    console.error('Error during GET request:', error)
    return sendErrorResponse('Failed to retrieve applicant statistics', error, 500)
  }
}
