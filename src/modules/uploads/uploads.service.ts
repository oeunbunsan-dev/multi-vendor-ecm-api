import { config } from "@/config";
import { BadRequestException } from "@/common/exceptions";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

export class UploadsService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = join(process.cwd(), config.uploads.dir);
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public async saveFile(file: File): Promise<{ filename: string; url: string; size: number; mimeType: string }> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    if (!config.uploads.allowedMimeTypes.includes(file.type)) {
      throw new BadRequestException(
        `Invalid file format. Allowed types: ${config.uploads.allowedMimeTypes.join(", ")}`
      );
    }

    if (file.size > config.uploads.maxSizeBytes) {
      throw new BadRequestException("File size exceeds 10MB limit");
    }

    const ext = file.name.split(".").pop() || "png";
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const destination = join(this.uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await Bun.write(destination, buffer);

    const url = `/uploads/${filename}`;

    return {
      filename,
      url,
      size: file.size,
      mimeType: file.type,
    };
  }
}

export const uploadsService = new UploadsService();
