import type { NextRequest } from 'next/server'

import connectMongoDB from '@/repository/mongoose'
import { sendErrorResponse, sendSuccessResponse } from '@/repository/response'
import Admin from '@/repository/models/admin'

export const POST = async (req: NextRequest) => {
  try {
    const { firstName, lastName, email, password } = await req.json()

    if (!password || !firstName || !lastName || !email) {
      return sendErrorResponse('Username or password is not present in the body', null, 400)
    }

    await connectMongoDB()

    const newAdmin = Admin.create({
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
    })

    return sendSuccessResponse('Admin created successfully', newAdmin, 200)
  } catch (error) {
    return sendErrorResponse('Failed to create admin', error, 500)
  }
}
