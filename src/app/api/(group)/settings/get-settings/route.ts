import type { NextRequest } from "next/server"

import Settings from "@/repository/models/settings"
import connectMongoDB from "@/repository/mongoose"
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response"

export const GET = async (req: NextRequest) => {
  try {
    await connectMongoDB()
    const settings = await Settings.findOne()

    if (!settings) {
      return sendErrorResponse('Failed to retrieve settings.', null, 500)
    }

    return sendSuccessResponse('Successfully retrieved settings document', settings, 200)
  } catch (error) {
    return sendErrorResponse('Failed to retrieve settings.', error, 500)
  }
}
