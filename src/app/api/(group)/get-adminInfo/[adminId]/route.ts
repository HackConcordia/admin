import type { NextRequest } from 'next/server'

import connectMongoDB from '@/repository/mongoose'
import { sendErrorResponse, sendSuccessResponse } from '@/repository/response'
import Admin from '@/repository/models/admin'

import type { IAdmin } from '@/interfaces/IAdmin'

export const GET = async (req: NextRequest, { params }: { params: { adminId: string } }) => {
  try {
    const adminId = params.adminId

    console.log('adminId', adminId)

    if (!adminId) {
      return sendErrorResponse('AdminId is not defined', null, 400)
    }

    await connectMongoDB()

    const admin: IAdmin | null = await Admin.findById(adminId)

    if (!admin) {
      console.log('No admin was found with the provided id.')
      return sendErrorResponse('No admin was found with the provided id.', null, 404)
    }

    return sendSuccessResponse('Admin found', admin, 200)
  } catch (error) {
    return sendErrorResponse('Failed to retrieve admin information', error, 500)
  }
}
