import type { NextRequest } from 'next/server'

import Team from '@/repository/models/team'
import connectMongoDB from '@/repository/mongoose'
import { sendErrorResponse, sendSuccessResponse } from '@/repository/response'
import Application from '@/repository/models/application'

interface ITeamMember {
  userId: string
  isAdmitted: boolean
}

interface ITeam {
  _id: string // ObjectId as a string
  teamName: string
  teamCode: string
  members: ITeamMember[]
  teamOwner: string
}

export const GET = async (req: NextRequest, { params }: { params: { applicationId: string } }) => {
  try {
    const applicationId = params.applicationId

    console.log('applicationId:', applicationId)

    if (applicationId === undefined) {
      console.log('applicationId is not defined')
      return sendErrorResponse('applicationId is not defined', {}, 500)
    }

    await connectMongoDB()

    const application = await Application.findById(applicationId)

    const team: ITeam | null = await Team.findOne({ _id: application.teamId })

    if (!team) {
      return sendSuccessResponse('Team not found', 'No team found', 404)
    }

    const memberInfo = await Promise.all(
      team.members.map(async (member: ITeamMember) => {
        console.log(member.userId)

        const user = await Application.findOne({ _id: member.userId }, 'email firstName lastName')

        console.log('User in users/team', user)

        return {
          userId: member.userId,
          isAdmitted: member.isAdmitted,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          profileImgUrl: '/pictures/avatar.png'
        }
      })
    )

    const teamInfo = {
      _id: team._id,
      teamName: team.teamName,
      teamCode: team.teamCode,
      members: memberInfo,
      teamOwner: team.teamOwner
    }

    return sendSuccessResponse('Team Info', teamInfo, 200)
  } catch (error) {
    return sendErrorResponse('Failed to get team info', error, 500)
  }
}
