import { StaffRole, Permission } from "@kazihq/shared";

export interface AccessTokenPayload {
  sub: string; // userId
  businessId: string;
  membershipId: string;
  role: StaffRole;
  permissions: Permission[];
}

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
}
