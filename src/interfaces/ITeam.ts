export interface ITeamMemberInfo {
  userId: string
  isAdmitted: boolean
  email?: string
  firstName?: string
  lastName?: string
  profileImgUrl: string
}

export interface ITeam {
  _id: string
  teamName: string
  teamCode: string
  members: ITeamMemberInfo[] | []
  teamOwner: string
}
