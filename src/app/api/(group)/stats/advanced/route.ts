import connectMongoDB from "@/repository/mongoose";
import { sendSuccessResponse, sendErrorResponse } from "@/repository/response";
import Application from "@/repository/models/application";

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

// Helper function to extract values from array fields that may contain JSON strings
const extractArrayValues = (arr: unknown): string[] => {
  if (!arr || !Array.isArray(arr)) return [];

  const result: string[] = [];

  for (const item of arr) {
    if (!item) continue;

    // If item is a string that looks like JSON array, parse it
    if (typeof item === "string") {
      if (item.startsWith("[")) {
        try {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed)) {
            result.push(...parsed.filter((v: unknown) => typeof v === "string" && v));
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

  return result;
};

export const GET = async () => {
  try {
    await connectMongoDB();

    // Fetch all applications with the new fields
    const applications = await Application.find(
      {},
      `isEighteenOrAbove faculty levelOfStudy program graduationYear 
       travelReimbursement preferredLanguage workingLanguages gender 
       pronouns underrepresented jobRolesLookingFor workRegions 
       jobTypesInterested isRegisteredForCoop nextCoopTerm country`,
    );

    if (!applications || applications.length === 0) {
      return sendErrorResponse("No applications found", {}, 404);
    }

    const totalApplicants = applications.length;

    // Age eligibility (isEighteenOrAbove)
    const ageEligibility = applications.reduce(
      (acc, app) => {
        const value = app.isEighteenOrAbove?.toLowerCase() || "not specified";
        if (value === "yes") acc.yes++;
        else if (value === "no") acc.no++;
        else acc.notSpecified++;
        return acc;
      },
      { yes: 0, no: 0, notSpecified: 0 },
    );

    // Faculty distribution
    const facultyCounts = applications.reduce(
      (acc, app) => {
        const faculty = app.faculty || "not specified";
        acc[faculty] = (acc[faculty] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const facultyDistribution = Object.entries(facultyCounts)
      .map(([faculty, count]) => ({
        name: formatDisplayName(faculty),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    // Level of study distribution
    const levelOfStudyCounts = applications.reduce(
      (acc, app) => {
        const level = app.levelOfStudy || "not specified";
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const levelOfStudyDistribution = Object.entries(levelOfStudyCounts)
      .map(([level, count]) => ({
        name: level,
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    // Program distribution
    const programCounts = applications.reduce(
      (acc, app) => {
        const program = app.program || "not specified";
        acc[program] = (acc[program] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const programDistribution = Object.entries(programCounts)
      .map(([program, count]) => ({
        name: formatDisplayName(program),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 programs

    // Graduation year distribution
    const graduationYearCounts = applications.reduce(
      (acc, app) => {
        const year = app.graduationYear || "not specified";
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

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
      { needed: 0, notNeeded: 0 },
    );

    // Preferred language distribution
    const languageCounts = applications.reduce(
      (acc, app) => {
        const lang = app.preferredLanguage || "not specified";
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const preferredLanguageDistribution = Object.entries(languageCounts)
      .map(([language, count]) => ({
        name: formatDisplayName(language),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    // Gender distribution
    const genderCounts = applications.reduce(
      (acc, app) => {
        const gender = app.gender || "not specified";
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const genderDistribution = Object.entries(genderCounts)
      .map(([gender, count]) => ({
        name: formatDisplayName(gender),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    // Country distribution (top 10)
    const countryCounts = applications.reduce(
      (acc, app) => {
        const country = app.country || "not specified";
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const countryDistribution = Object.entries(countryCounts)
      .map(([country, count]) => ({
        code: country,
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Co-op registration stats
    const coopStats = applications.reduce(
      (acc, app) => {
        if (app.isRegisteredForCoop === true) acc.registered++;
        else acc.notRegistered++;
        return acc;
      },
      { registered: 0, notRegistered: 0 },
    );

    // Job types interested (flatten arrays and count)
    const jobTypeCounts: Record<string, number> = {};
    applications.forEach((app) => {
      const jobTypes = extractArrayValues(app.jobTypesInterested);
      jobTypes.forEach((type: string) => {
        if (type) {
          const normalizedType = type.toLowerCase().trim();
          jobTypeCounts[normalizedType] = (jobTypeCounts[normalizedType] || 0) + 1;
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
          workRegionCounts[normalizedRegion] = (workRegionCounts[normalizedRegion] || 0) + 1;
        }
      });
    });

    const workRegionsDistribution = Object.entries(workRegionCounts)
      .map(([region, count]) => ({
        name: formatDisplayName(region),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    const responseData = {
      totalApplicants,
      ageEligibility,
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
    };

    return sendSuccessResponse("Advanced statistics retrieved successfully", responseData);
  } catch (error) {
    console.error("Error during GET request:", error);
    return sendErrorResponse("Failed to retrieve advanced statistics", error, 500);
  }
};
