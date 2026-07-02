import { SetMetadata } from "@nestjs/common";

export interface LogActivityMeta {
  action: string;
  entityType: string;
}

export const LOG_ACTIVITY_KEY = "logActivity";
export const LogActivity = (action: string, entityType: string) =>
  SetMetadata(LOG_ACTIVITY_KEY, { action, entityType } as LogActivityMeta);
