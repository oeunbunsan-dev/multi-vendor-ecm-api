import { prisma } from "@/database/prisma";
import { User, Prisma } from "@prisma/client";

export class AuthRepository {
  public async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        vendor: {
          select: {
            id: true,
            status: true,
            companyName: true,
          },
        },
      },
    });
  }

  public async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        vendor: {
          include: {
            stores: true,
          },
        },
      },
    });
  }

  public async findByVerificationToken(token: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { verificationToken: token },
    });
  }

  public async findByResetToken(token: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });
  }

  public async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
      },
    });
  }

  public async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }
}

export const authRepository = new AuthRepository();
