import type { NextRequest } from 'next/server'

import { sendSuccessResponse, sendErrorResponse } from '@/repository/response'
import Settings from '@/repository/models/settings'
import connectMongoDB from '@/repository/mongoose'

export const PATCH = async (req: NextRequest) => {
  try {
    const body = await req.json()

    await connectMongoDB()
    const settings = await Settings.findOne()

    if (!settings) {
      return sendErrorResponse('Failed to retrieve settings document.', null, 500)
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      {},
      {
        registrationOpeningDate: body.registrationOpeningDate || settings.registrationOpeningDate,
        registrationClosingDate: body.registrationClosingDate || settings.registrationClosingDate,
        confirmationDate: body.confirmationDate || settings.confirmationDate
      },
      { new: true }
    )

    if (!updatedSettings) {
      return sendErrorResponse('Failed to update user information', null, 500)
    }

    return sendSuccessResponse('Successfully update settings', updatedSettings, 200)
  } catch (error) {
    return sendErrorResponse('Failed to update settings', null, 500)
  }
}


