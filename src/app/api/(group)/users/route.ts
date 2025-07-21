import type { NextRequest } from 'next/server'

import connectMongoDB from '@/repository/mongoose'
import { sendSuccessResponse, sendErrorResponse } from '@/repository/response'
import Application from '@/repository/models/application'
import type { IApplication } from '@/interfaces/IApplication'
import Admin from '@/repository/models/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = async (req: NextRequest) => {
  const id = req.nextUrl.searchParams.get('id')

  if (!id) {
    return sendErrorResponse('ID not found in the request', {}, 400)
  }

  try {
    await connectMongoDB()

    const admin = await Admin.findById(id)

    if (!admin) {
      return sendErrorResponse('Admin not found', {}, 404)
    }

    if (admin.isSuperAdmin) {
      const applications: IApplication[] | null = await Application.find({}, 'email firstName lastName status processedBy')

      console.log('--------------------------------------------')
      console.log(applications)

      if (!applications) {
        return sendErrorResponse('No applications found', {}, 404)
      }

      const response = sendSuccessResponse('applications information retrieved successfully', applications, 200)

      response.headers.set('Cache-Control', 'no-store')

      return response
    } else {
      const assignedApplications: string[] = admin.assignedApplications
      console.log('Assigned Applications:', assignedApplications)
      const applicantsForAdmin: IApplication[] = []

      for (const applicationId of assignedApplications) {
        const application: IApplication | null = await Application.findById(
          applicationId,
          'email firstName lastName status'
        )

        if (application) {
          applicantsForAdmin.push(application)
        }
      }

      const response = sendSuccessResponse('applications information retrieved successfully', applicantsForAdmin, 200)

      response.headers.set('Cache-Control', 'no-store')

      return response
    }
  } catch (error) {
    console.error('Error during GET request:', error)

    return sendErrorResponse('Failed to retrieve applications information', error, 500)
  }
}
