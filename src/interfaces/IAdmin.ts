export interface IAdmin {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isSuperAdmin: boolean;
  assignedApplications: string[];
}
