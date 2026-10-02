import { authRepository, AuthRepository } from "./auth.repository";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@/common/exceptions";
import { comparePassword, hashPassword, generateToken } from "@/common/utils/crypto";
import { recordAuditLog } from "@/common/middleware/audit.middleware";
import { Role } from "@prisma/client";

export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: Role;
}

export interface RegisterVendorDTO extends RegisterDTO {
  companyName: string;
  businessNumber?: string;
  taxId?: string;
}

export class AuthService {
  constructor(private readonly repo: AuthRepository = authRepository) {}

  public async register(dto: RegisterDTO) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await hashPassword(dto.password);
    const verificationToken = generateToken(24);

    const user = await this.repo.createUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role || Role.CUSTOMER,
      verificationToken,
    });

    await recordAuditLog({
      userId: user.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: user.id,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      verificationToken, // In production, this would be sent via email
    };
  }

  public async registerVendor(dto: RegisterVendorDTO) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await hashPassword(dto.password);
    const verificationToken = generateToken(24);

    const user = await this.repo.createUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: Role.VENDOR,
      verificationToken,
      vendor: {
        create: {
          companyName: dto.companyName,
          businessNumber: dto.businessNumber,
          taxId: dto.taxId,
          status: "PENDING",
        },
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: "VENDOR_REGISTERED",
      entity: "Vendor",
      entityId: user.id,
      newValue: { companyName: dto.companyName },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyName: dto.companyName,
      status: "PENDING",
      verificationToken,
    };
  }

  public async login(
    email: string,
    pass: string,
    signAccess: (payload: Record<string, unknown>) => Promise<string>,
    signRefresh: (payload: Record<string, unknown>) => Promise<string>
  ) {
    const user = await this.repo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValid = await comparePassword(pass, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await signAccess(tokenPayload);
    const refreshToken = await signRefresh(tokenPayload);

    // Update last login
    await this.repo.updateUser(user.id, { lastLoginAt: new Date() });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vendor: (user as any).vendor || null,
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: "Bearer",
      },
    };
  }

  public async refreshToken(
    token: string,
    verifyRefresh: (token: string) => Promise<Record<string, unknown> | null>,
    signAccess: (payload: Record<string, unknown>) => Promise<string>,
    signRefresh: (payload: Record<string, unknown>) => Promise<string>
  ) {
    const payload = await verifyRefresh(token);
    if (!payload || !payload.id) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.repo.findById(payload.id as string);
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("User not found or inactive");
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = await signAccess(tokenPayload);
    const newRefreshToken = await signRefresh(tokenPayload);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: "Bearer",
    };
  }

  public async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    const valid = await comparePassword(currentPass, user.passwordHash);
    if (!valid) {
      throw new BadRequestException("Current password is incorrect");
    }

    const newHash = await hashPassword(newPass);
    await this.repo.updateUser(userId, { passwordHash: newHash });

    await recordAuditLog({
      userId,
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: userId,
    });

    return { message: "Password updated successfully" };
  }

  public async forgotPassword(email: string) {
    const user = await this.repo.findByEmail(email);
    if (!user) {
      // Don't leak existence of email
      return { message: "If an account exists, a reset instructions token was generated" };
    }

    const resetToken = generateToken(32);
    const resetExpires = new Date(Date.now() + 3600 * 1000); // 1 hour

    await this.repo.updateUser(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
    });

    return {
      message: "If an account exists, a reset instructions token was generated",
      resetToken, // for testing / development convenience
    };
  }

  public async resetPassword(token: string, newPass: string) {
    const user = await this.repo.findByResetToken(token);
    if (!user) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const newHash = await hashPassword(newPass);
    await this.repo.updateUser(user.id, {
      passwordHash: newHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return { message: "Password has been reset successfully" };
  }

  public async verifyEmail(token: string) {
    const user = await this.repo.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException("Invalid verification token");
    }

    await this.repo.updateUser(user.id, {
      emailVerified: true,
      verificationToken: null,
    });

    return { message: "Email successfully verified" };
  }

  public async getMe(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      avatar: user.avatar,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vendor: (user as any).vendor,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
