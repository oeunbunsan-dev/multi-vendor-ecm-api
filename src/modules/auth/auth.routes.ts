import { Elysia, t } from "elysia";
import { authService } from "./auth.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException } from "@/common/exceptions";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(authPlugin)
  .post(
    "/register",
    async ({ body }) => {
      const result = await authService.register(body);
      return successResponse(result, "Account created successfully");
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Customer Registration",
        description: "Registers a new customer account.",
      },
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
        phone: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/register-vendor",
    async ({ body }) => {
      const result = await authService.registerVendor(body);
      return successResponse(result, "Vendor application submitted successfully");
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Vendor Registration",
        description: "Registers a new vendor account with business details.",
      },
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
        phone: t.Optional(t.String()),
        companyName: t.String({ minLength: 2 }),
        businessNumber: t.Optional(t.String()),
        taxId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, jwtAccess, jwtRefresh }) => {
      const result = await authService.login(
        body.email,
        body.password,
        (payload) => jwtAccess.sign(payload as any),
        (payload) => jwtRefresh.sign(payload as any)
      );
      return successResponse(result, "Login successful");
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "User Login",
        description: "Authenticates with email and password to receive JWT tokens.",
      },
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    }
  )
  .post(
    "/refresh",
    async ({ body, jwtAccess, jwtRefresh }) => {
      const result = await authService.refreshToken(
        body.refreshToken,
        (token) => jwtRefresh.verify(token) as any,
        (payload) => jwtAccess.sign(payload as any),
        (payload) => jwtRefresh.sign(payload as any)
      );
      return successResponse(result, "Token refreshed successfully");
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Refresh Access Token",
        description: "Exchanges a valid refresh token for a new access token.",
      },
      body: t.Object({
        refreshToken: t.String(),
      }),
    }
  )
  .post(
    "/forgot-password",
    async ({ body }) => {
      const result = await authService.forgotPassword(body.email);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Forgot Password",
        description: "Generates password reset token.",
      },
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
    }
  )
  .post(
    "/reset-password",
    async ({ body }) => {
      const result = await authService.resetPassword(body.token, body.newPassword);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Reset Password",
        description: "Sets new password using reset token.",
      },
      body: t.Object({
        token: t.String(),
        newPassword: t.String({ minLength: 8 }),
      }),
    }
  )
  .get(
    "/verify-email",
    async ({ query }) => {
      const result = await authService.verifyEmail(query.token);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Verify Email",
        description: "Verifies user email via token link.",
      },
      query: t.Object({
        token: t.String(),
      }),
    }
  )
  .post(
    "/change-password",
    async ({ body, user }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const result = await authService.changePassword(user.id, body.currentPassword, body.newPassword);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Change Password",
        security: [{ bearerAuth: [] }],
        description: "Updates password for currently authenticated user.",
      },
      body: t.Object({
        currentPassword: t.String(),
        newPassword: t.String({ minLength: 8 }),
      }),
    }
  )
  .get(
    "/me",
    async ({ user }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const profile = await authService.getMe(user.id);
      return successResponse(profile);
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Current User Profile",
        security: [{ bearerAuth: [] }],
        description: "Returns profile of authenticated user.",
      },
    }
  );
