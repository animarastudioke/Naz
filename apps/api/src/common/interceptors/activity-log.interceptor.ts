import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";
import { LOG_ACTIVITY_KEY, LogActivityMeta } from "../decorators/log-activity.decorator";
import { AccessTokenPayload } from "../types/auth.types";

/** Fires a fire-and-forget ActivityLog row for handlers annotated with @LogActivity. */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<LogActivityMeta | undefined>(LOG_ACTIVITY_KEY, context.getHandler());

    return next.handle().pipe(
      tap((result) => {
        if (!meta) return;
        const request = context.switchToHttp().getRequest();
        const user: AccessTokenPayload | undefined = request.user;
        if (!user) return;

        const entityId = (result as { id?: string })?.id ?? request.params?.id ?? "unknown";

        this.prisma.activityLog
          .create({
            data: {
              businessId: user.businessId,
              actorId: user.membershipId,
              action: meta.action,
              entityType: meta.entityType,
              entityId,
              ipAddress: request.ip,
            },
          })
          .catch(() => undefined);
      })
    );
  }
}
