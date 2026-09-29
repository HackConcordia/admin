import { cookies } from "next/headers";

import { getEventConfig } from "@/config/event";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { groupMealDays, type MealDay } from "@/lib/conuhacks/meals";
import connectMongoDB from "@/repository/mongoose";
import Meal from "@/repository/models/meal";

import { MealTable } from "./_components/meal-table";

export const dynamic = "force-dynamic";

export type MealTableRow = {
  _id: string;
  name: string;
  email: string;
  meals: Array<{
    date: Date;
    type: "breakfast" | "lunch" | "snacks" | "dinner";
    taken: boolean;
  }>;
};

async function getMealsSSR(): Promise<{
  data: MealTableRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return {
        data: [],
        pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 0 },
      };
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return {
        data: [],
        pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 0 },
      };
    }

    await connectMongoDB();

    const pageSize = 10;
    const totalRecords = await Meal.countDocuments({});
    const totalPages = Math.ceil(totalRecords / pageSize);

    const meals = await Meal.find({}).limit(pageSize).lean();

    const data = (meals ?? []).map((m: any) => ({
      _id: String(m._id),
      name: m.name,
      email: m.email,
      meals: m.meals || [],
    }));

    return {
      data,
      pagination: {
        page: 1,
        pageSize,
        totalRecords,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Error fetching meals SSR:", error);
    return {
      data: [],
      pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 0 },
    };
  }
}

function readMealSettings(): { eventName: string; mealDays: MealDay[]; configError: string | null } {
  try {
    const config = getEventConfig();
    return { eventName: config.eventName, mealDays: groupMealDays(config.meals), configError: null };
  } catch (error) {
    return {
      eventName: "ConUHacks XI",
      mealDays: [],
      configError: error instanceof Error ? error.message : "Event settings are not configured",
    };
  }
}

export default async function Page() {
  const initialData = await getMealsSSR();
  const { eventName, mealDays, configError } = readMealSettings();

  return (
    <MealTable
      initialData={initialData.data}
      initialPagination={initialData.pagination}
      eventName={eventName}
      mealDays={mealDays}
      configError={configError}
    />
  );
}
