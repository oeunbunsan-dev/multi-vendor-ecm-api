import { Elysia, t } from "elysia";
import { notificationsService } from "./notifications.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException } from "@/common/exceptions";

export const notificationsRoutes = new Elysia({ prefix: "/notifications" })
  .use(authPlugin)
  .get(
    "/",
    async ({ user, query }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const limit = query.limit ? parseInt(query.limit) : 20;
      const result = await notificationsService.getUserNotifications(user.id, limit);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Notifications"],
        summary: "Get User Notifications",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        limit: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    "/:id/read",
    async ({ user, params }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const updated = await notificationsService.markAsRead(params.id, user.id);
      return successResponse(updated);
    },
    {
      detail: {
        tags: ["Notifications"],
        summary: "Mark Notification as Read",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
    }
  )
  .post(
    "/read-all",
    async ({ user }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const result = await notificationsService.markAllAsRead(user.id);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Notifications"],
        summary: "Mark All Notifications as Read",
        security: [{ bearerAuth: [] }],
      },
    }
  );
