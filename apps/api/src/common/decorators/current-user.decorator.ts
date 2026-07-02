import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AccessTokenPayload } from "../types/auth.types";

export const CurrentUser = createParamDecorator(
  (data: keyof AccessTokenPayload | undefined, ctx: ExecutionContext): AccessTokenPayload | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user: AccessTokenPayload = request.user;
    return data ? user?.[data] : user;
  }
);

/** Shorthand for the current tenant's businessId, the backbone of all tenant-scoped queries. */
export const CurrentBusinessId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.user.businessId;
});
