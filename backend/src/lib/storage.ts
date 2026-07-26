import fs from "node:fs";
import path from "node:path";
import { isCloudStorageEnabled } from "../modules/settings/settings.service.js";
import { uploadBufferToCloudinary } from "./cloudinary.js";

const UPLOAD_ROOT = path.resolve("uploads");

function saveToDisk(subfolder: string, file: Express.Multer.File): string {
  const dir = path.join(UPLOAD_ROOT, subfolder);
  fs.mkdirSync(dir, { recursive: true });

  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);

  return `/uploads/${subfolder}/${filename}`;
}

export async function saveUploadedImage(
  subfolder: string,
  file: Express.Multer.File,
): Promise<string> {
  if (await isCloudStorageEnabled()) {
    return uploadBufferToCloudinary(file.buffer, subfolder);
  }
  return saveToDisk(subfolder, file);
}
