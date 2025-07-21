import { NextResponse } from 'next/server'

import type { SuccessResponse, ErrorResponse } from '@/interfaces/IResponse'

export const sendSuccessResponse = <T>(message: string, data: T, statusCode: number = 200) => {
  const response: SuccessResponse<T> = {
    status: 'success',
    message,
    data
  }

  return new NextResponse(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export const sendErrorResponse = (message: string, error: any, statusCode: number = 500) => {
  const response: ErrorResponse = {
    status: 'error',
    message,
    error
  }

  return new NextResponse(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
