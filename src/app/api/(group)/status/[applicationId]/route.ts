import type { NextRequest } from 'next/server'

import connectMongoDB from '@/repository/mongoose'
import { sendErrorResponse, sendSuccessResponse } from '@/repository/response'

import { sendAdmittedEmail, sendWaitlistedEmail, sendRefusedEmail } from '@/utils/admissionEmailConfig'
import Application from '@/repository/models/application'

export const PATCH = async (req: NextRequest, { params }: { params: { applicationId: string } }) => {
  try {
    const applicationId = params.applicationId
    const { action, adminEmail } = await req.json()

    await connectMongoDB()

    const application = await Application.findById(applicationId)

    if (!application) {
      return sendErrorResponse('User not found', null, 404)
    }

    if (action === 'admit') {
      console.log('Application Info', application.email, application.firstName, application.lastName)
      const sendEmail = await sendAdmittedEmail(
        application.email as string,
        application.firstName as string,
        application.lastName as string
      )

      if (!sendEmail) {
        console.log('Failed to send admitted email')
        return sendErrorResponse('Failed to send admitted email', null, 500)
      }

      application.status = 'Admitted'
    } else if (action === 'waitlist') {
      // const sendEmail = await sendWaitlistedEmail(
      //   application.email as string,
      //   application.firstName as string,
      //   application.lastName as string
      // )
      
      // if (!sendEmail) {
      //   return sendErrorResponse('Failed to send waitlisted email', null, 500)
      // }
      
      application.status = 'Waitlisted'
    } else if (action === 'reject') {
      const sendEmail = await sendRefusedEmail(
        application.email as string,
        application.firstName as string,
        application.lastName as string
      )
      
      if (!sendEmail) {
        return sendErrorResponse('Failed to send refued email', null, 500)
      }
      
      application.status = 'Refused'
    } else {
      return sendErrorResponse('Invalid action', null, 400)
    }
    
    application.processedBy = adminEmail
    application.processedAt = new Date()
    await application.save()

    return sendSuccessResponse('Attendance confirmed', application.status, 200)
  } catch (error) {
    return sendErrorResponse('Something went wrong while confirming attendance', null, 500)
  }
}
