import connectMongoDB from "@/repository/mongoose";
import { sendSuccessResponse, sendErrorResponse } from "@/repository/response";
import Application from "@/repository/models/application";
import Admin from "@/repository/models/admin";
import { Countries as CountryList } from "@/constants/Countries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Utility function to format display names
const formatDisplayName = (value: string) => {
  if (!value) return "Not specified";
  return value
    .replace(/-/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Helper function to extract values from fields that may be strings, JSON strings, or arrays
const extractArrayValues = (value: unknown): string[] => {
  if (!value) return [];

  const result: string[] = [];

  // Handle string input (single value, JSON array, or comma-separated)
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // If string looks like JSON array, parse it
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          result.push(
            ...parsed.filter((v: unknown) => typeof v === "string" && v)
          );
          return result;
        }
      } catch {
        // Not valid JSON, continue to other parsing methods
      }
    }

    // Check if it's comma-separated values
    if (trimmed.includes(",")) {
      const parts = trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      result.push(...parts);
      return result;
    }

    // Single value
    result.push(trimmed);
    return result;
  }

  // Handle array input
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item) continue;

      if (typeof item === "string") {
        if (item.startsWith("[")) {
          try {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed)) {
              result.push(
                ...parsed.filter((v: unknown) => typeof v === "string" && v)
              );
            }
          } catch {
            // Not valid JSON, use as-is
            result.push(item);
          }
        } else {
          result.push(item);
        }
      } else if (Array.isArray(item)) {
        result.push(...item.filter((v: unknown) => typeof v === "string" && v));
      }
    }
  }

  return result;
};

export const GET = async () => {
  try {
    await connectMongoDB();

    // Fetch all applications with the new fields, excluding Unverified and Incomplete
    const applications = await Application.find(
      {
        status: { $nin: ["Unverified", "Incomplete"] },
      },
      {
        isEighteenOrAbove: 1,
        faculty: 1,
        levelOfStudy: 1,
        program: 1,
        graduationYear: 1,
        travelReimbursement: 1,
        preferredLanguage: 1,
        workingLanguages: 1,
        gender: 1,
        pronouns: 1,
        underrepresented: 1,
        jobRolesLookingFor: 1,
        workRegions: 1,
        jobTypesInterested: 1,
        isRegisteredForCoop: 1,
        nextCoopTerm: 1,
        country: 1,
        isTravelReimbursementApproved: 1,
        travelReimbursementAmount: 1,
        travelReimbursementCurrency: 1,
        processedBy: 1,
        status: 1,
      }
    ).lean();

    if (!applications || applications.length === 0) {
      return sendErrorResponse("No applications found", {}, 404);
    }

    const totalApplicants = applications.length;

    // Total Travel Reimbursement
    const totalTravelReimbursement = applications.reduce((acc, app) => {
      if (app.isTravelReimbursementApproved !== true) return acc;

      let amount = parseFloat(app.travelReimbursementAmount as any) || 0;
      if (app.travelReimbursementCurrency === "USD") {
        amount = amount * 1.39;
      }
      return acc + amount;
    }, 0);

    // Build country code -> name map (English labels)
    // Countries is a function that returns an array of { value, label }
    const countryNameByCode = new Map<string, string>(
      CountryList().map((c) => [c.value, c.label])
    );

    // Faculty distribution
    const facultyCounts = applications.reduce((acc, app) => {
      const faculty = app.faculty || "not specified";
      acc[faculty] = (acc[faculty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const facultyDistribution = Object.entries(facultyCounts)
      .map(([faculty, count]) => ({
        name: formatDisplayName(faculty),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    // Level of study distribution
    const levelOfStudyCounts = applications.reduce((acc, app) => {
      const level = app.levelOfStudy || "not specified";
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const levelOfStudyDistribution = Object.entries(levelOfStudyCounts)
      .map(([level, count]) => ({
        name: level,
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    // Program distribution
    const programCounts = applications.reduce((acc, app) => {
      const program = app.program || "not specified";
      acc[program] = (acc[program] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const programDistribution = Object.entries(programCounts)
      .map(([program, count]) => ({
        name: formatDisplayName(program),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 programs

    // Graduation year distribution
    const graduationYearCounts = applications.reduce((acc, app) => {
      const year = app.graduationYear || "not specified";
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const graduationYearDistribution = Object.entries(graduationYearCounts)
      .map(([year, count]) => ({
        year,
        count: count as number,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    // Travel reimbursement
    const travelReimbursement = applications.reduce(
      (acc, app) => {
        if (app.travelReimbursement === true) acc.needed++;
        else acc.notNeeded++;
        return acc;
      },
      { needed: 0, notNeeded: 0 }
    );

    // Preferred language distribution
    const languageCounts = applications.reduce((acc, app) => {
      const lang = app.preferredLanguage || "not specified";
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const preferredLanguageDistribution = Object.entries(languageCounts)
      .map(([language, count]) => ({
        name: formatDisplayName(language),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    // Gender distribution
    const genderCounts = applications.reduce((acc, app) => {
      const gender = app.gender || "not specified";
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const genderDistribution = Object.entries(genderCounts)
      .map(([gender, count]) => ({
        name: formatDisplayName(gender),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    // Country distribution (top 10)
    const countryCounts = applications.reduce((acc, app) => {
      const country = app.country || "not specified";
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const countryDistribution = Object.entries(countryCounts)
      .map(([countryCode, count]) => {
        const name =
          countryNameByCode.get(countryCode) ||
          countryCode ||
          "Not specified";
        return {
          code: name,
          count: count as number,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Co-op registration stats
    const coopStats = applications.reduce(
      (acc, app) => {
        if (app.isRegisteredForCoop === true) acc.registered++;
        else acc.notRegistered++;
        return acc;
      },
      { registered: 0, notRegistered: 0 }
    );

    // Job types interested (flatten arrays and count)
    const jobTypeCounts: Record<string, number> = {};
    applications.forEach((app) => {
      const jobTypes = extractArrayValues(app.jobTypesInterested);
      jobTypes.forEach((type: string) => {
        if (type) {
          const normalizedType = type.toLowerCase().trim();
          jobTypeCounts[normalizedType] =
            (jobTypeCounts[normalizedType] || 0) + 1;
        }
      });
    });

    const jobTypesDistribution = Object.entries(jobTypeCounts)
      .map(([type, count]) => ({
        name: formatDisplayName(type),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    // Work regions (flatten arrays and count)
    const workRegionCounts: Record<string, number> = {};
    applications.forEach((app) => {
      const regions = extractArrayValues(app.workRegions);
      regions.forEach((region: string) => {
        if (region) {
          const normalizedRegion = region.toLowerCase().trim();
          workRegionCounts[normalizedRegion] =
            (workRegionCounts[normalizedRegion] || 0) + 1;
        }
      });
    });

    const workRegionsDistribution = Object.entries(workRegionCounts)
      .map(([region, count]) => ({
        name: formatDisplayName(region),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    // Per-admin assignment metrics
    const admins = await Admin.find({}, "firstName lastName email assignedApplications")
      .lean<{ firstName: string; lastName: string; email: string; assignedApplications?: string[] }[]>()
      .exec();

    const applicationById = new Map<string, any>();
    for (const app of applications as any[]) {
      applicationById.set(String(app._id), app);
    }

    const adminAssignmentMetrics = admins.map((admin) => {
      const assignedIds = admin.assignedApplications || [];
      let submittedCount = 0;

      for (const appId of assignedIds) {
        const app = applicationById.get(appId);
        if (app && app.status === "Submitted") {
          submittedCount++;
        }
      }

      return {
        adminName: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        totalAssigned: assignedIds.length,
        submittedAssigned: submittedCount,
      };
    }).filter((metric) => metric.totalAssigned > 0);

    const responseData = {
      totalApplicants,
      totalTravelReimbursement,
      facultyDistribution,
      levelOfStudyDistribution,
      programDistribution,
      graduationYearDistribution,
      travelReimbursement,
      preferredLanguageDistribution,
      genderDistribution,
      countryDistribution,
      coopStats,
      jobTypesDistribution,
      workRegionsDistribution,
      adminAssignmentMetrics,
    };

    return sendSuccessResponse(
      "Advanced statistics retrieved successfully",
      responseData
    );
  } catch (error) {
    console.error("Error during GET request:", error);
    return sendErrorResponse(
      "Failed to retrieve advanced statistics",
      error,
      500
    );
  }
};
