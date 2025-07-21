import type { NextRequest } from 'next/server'

import connectMongoDB from '@/repository/mongoose'
import { sendErrorResponse, sendSuccessResponse } from '@/repository/response'
import Admin from '@/repository/models/admin'
import Application from '@/repository/models/application'

export const POST = async (req: NextRequest) => {
  try {
    const { selectedAdminEmail, selectedApplicants } = await req.json()

    console.log('Selected Admin Email', selectedAdminEmail)
    console.log('Selected Applicants', selectedApplicants)

    if (!(selectedAdminEmail && selectedApplicants)) {
      return sendErrorResponse('Admin email or applicants list is not present in the body', null, 400)
    }

    await connectMongoDB()

    const admin = await Admin.findOne({ email: selectedAdminEmail })

    if (!admin) {
      return sendErrorResponse('Admin not found', null, 404)
    }

    // Create a new array with unique values
    const existingApplications = admin.assignedApplications || []
    const uniqueApplications = Array.from(new Set([...existingApplications, ...selectedApplicants]))

    admin.assignedApplications = uniqueApplications

    for (const applicationId of selectedApplicants) {
      const applicant = await Application.findById(applicationId)

      if (!applicant) {
        return sendErrorResponse('Applicant not found', null, 404)
      }

      if (applicant.processedBy !== selectedAdminEmail && applicant.processedBy !== 'Not processed') {
        // Find previous admin and remove the application from their assignedApplications
        const previousAdmin = await Admin.findOne({ email: applicant.processedBy })

        if (previousAdmin) {
          previousAdmin.assignedApplications = previousAdmin.assignedApplications.filter(
            (appId: string) => appId !== applicationId
          )

          await previousAdmin.save()
        }
      }

      // Update the application with the new admin
      const updateApplicant = await Application.findByIdAndUpdate(
        applicationId,
        {
          $set: { processedBy: selectedAdminEmail }
        },
        { new: true }
      )

      if (!updateApplicant) {
        return sendErrorResponse('Failed to update applicant', null, 500)
      }
    }

    await admin.save()

    return sendSuccessResponse('Applications successfully assigned', admin.assignedApplications, 200)
  } catch (error) {
    return sendErrorResponse('Failed to assign applications', error, 500)
  }
}
