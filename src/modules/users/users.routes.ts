import { Elysia, t } from "elysia";
import { usersService } from "./users.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException } from "@/common/exceptions";

export const usersRoutes = new Elysia({ prefix: "/users" })
  .use(authPlugin)
  .put(
    "/profile",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const updated = await usersService.updateProfile(user.id, body);
      return successResponse(updated, "Profile updated successfully");
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Update Profile",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        avatar: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/addresses",
    async ({ user }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const addresses = await usersService.getAddresses(user.id);
      return successResponse(addresses);
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Get Addresses",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .post(
    "/addresses",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const address = await usersService.createAddress(user.id, body as any);
      return successResponse(address, "Address created successfully");
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Create Address",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        type: t.Optional(t.Union([t.Literal("SHIPPING"), t.Literal("BILLING"), t.Literal("BOTH")])),
        firstName: t.String(),
        lastName: t.String(),
        phone: t.String(),
        street: t.String(),
        city: t.String(),
        state: t.Optional(t.String()),
        postalCode: t.String(),
        country: t.Optional(t.String()),
        isDefault: t.Optional(t.Boolean()),
      }),
    }
  )
  .put(
    "/addresses/:id",
    async ({ user, params, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const address = await usersService.updateAddress(user.id, params.id, body as any);
      return successResponse(address, "Address updated successfully");
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Update Address",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        type: t.Optional(t.Union([t.Literal("SHIPPING"), t.Literal("BILLING"), t.Literal("BOTH")])),
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        street: t.Optional(t.String()),
        city: t.Optional(t.String()),
        state: t.Optional(t.String()),
        postalCode: t.Optional(t.String()),
        country: t.Optional(t.String()),
        isDefault: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete(
    "/addresses/:id",
    async ({ user, params }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const result = await usersService.deleteAddress(user.id, params.id);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Delete Address",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
    }
  );
