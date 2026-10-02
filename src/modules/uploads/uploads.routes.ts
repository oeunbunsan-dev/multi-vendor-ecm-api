import { Elysia, t } from "elysia";
import { uploadsService } from "./uploads.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";

export const uploadsRoutes = new Elysia({ prefix: "/uploads" })
  .use(authPlugin)
  .post(
    "/",
    async ({ user, body }) => {
      // Allow file uploads (authenticated users or guest uploads for registration/contact forms)
      const result = await uploadsService.saveFile(body.file as File);
      return successResponse(
        {
          ...result,
          uploadedBy: user ? { id: user.id, email: user.email } : null,
        },
        "File uploaded successfully"
      );
    },
    {
      detail: {
        tags: ["Uploads"],
        summary: "Upload Image Asset",
        security: [{ bearerAuth: [] }],
        description: "Uploads product images, logos, banners, or user avatars. Supports Bearer and X-Access-Token headers.",
      },
      body: t.Object({
        file: t.File(),
      }),
    }
  );
