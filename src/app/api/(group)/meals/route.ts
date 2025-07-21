import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

import mongoose from "mongoose";

import Meal from "@/repository/models/meal";
import connectMongoDB from "@/repository/mongoose";

// Connect to the database
const connect = async () => {
  await connectMongoDB();
};

// Function to create a meal
const createMeal = async (req: NextRequest) => {
  try {
    const { id, meals } = await req.json(); // Get user ID and meals from the request body
    const newMeal = new Meal({ id, meals });
    await newMeal.save();
    return NextResponse.json(newMeal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
};

// Function to update a meal
const updateMeal = async (req: NextRequest) => {
  try {
    const { id, mealData } = await req.json(); // Get user ID and mealData from the request body

    console.log("id:", id); // Log the ID to make sure it's being passed correctly

    // Ensure the id is converted to ObjectId if it's a string
    const userId = new mongoose.Types.ObjectId(id); // Convert the string to ObjectId

    // Fetch the current meal data to update it based on checkbox selection
    const userMeal = await Meal.findOne({ _id: userId }); // Use ObjectId for querying

    if (!userMeal) {
      return NextResponse.json({ message: 'Meal record not found for this user' }, { status: 404 });
    }

    // Update meals for the user based on the provided mealData
    const updatedMeals = userMeal.meals.map((meal: { date: string | number | Date; type: any; }) => {
      const updatedMeal = mealData.find((newMeal: { date: string | number | Date; type: any; }) =>
        new Date(newMeal.date).toDateString() === new Date(meal.date).toDateString() && newMeal.type === meal.type
      );

      if (updatedMeal) {
        return { ...meal, taken: updatedMeal.taken }; // Update 'taken' status based on the checkbox
      }

      return meal; // Keep the meal unchanged if no match is found
    });

    // Update the meal document in the database
    userMeal.meals = updatedMeals;
    await userMeal.save(); // Save the updated meal data

    return NextResponse.json(userMeal, { status: 200 }); // Return the updated meal record
  } catch (error) {
    console.error('Error updating meal:', error);
    return NextResponse.json({ message: error || 'Something went wrong' }, { status: 500 });
  }
};



const getMeals = async (req: NextRequest) => {
  try {
    const meals = await Meal.find({});
    if (!meals) {
      return NextResponse.json({ message: 'Meals not found for this user' }, { status: 404 });
    }

    return NextResponse.json({ data: meals }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
};

export async function GET(req: NextRequest) {
  await connect();
  return getMeals(req);
}

export async function POST(req: NextRequest) {
  await connect();
  return createMeal(req);
}

export async function PUT(req: NextRequest) {
  await connect();
  return updateMeal(req);
}

// Optional: Handle unsupported HTTP methods
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({ message: 'Allowed methods: POST, PUT, GET' }, { status: 200 });
}
