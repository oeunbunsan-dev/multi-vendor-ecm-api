import { Elysia, t } from "elysia";
import { uploadsService } from "./uploads.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException } from "@/common/exceptions";

export const uploadsRoutes = new Elysia({ prefix: "/uploads" })
  .use(authPlugin)
  .post(
    "/",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const result = await uploadsService.saveFile(body.file as File);
      return successResponse(result, "File uploaded successfully");
    },
    {
      detail: {
        tags: ["Uploads"],
        summary: "Upload Image Asset",
        security: [{ bearerAuth: [] }],
        description: "Uploads product images, logos, or banners.",
      },
      body: t.Object({
        file: t.File(),
      }),
    }
  );
