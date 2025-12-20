import { cookies } from "next/headers";

import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
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

export default async function Page() {
  const initialData = await getMealsSSR();

  return (
    <MealTable initialData={initialData.data} initialPagination={initialData.pagination} />
  );
}
