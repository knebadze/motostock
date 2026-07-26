import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { ApiError } from "../lib/ApiError.js";

const UPLOAD_ROOT = path.resolve("uploads");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function storageFor(subfolder: string) {
  const dir = path.join(UPLOAD_ROOT, subfolder);
  fs.mkdirSync(dir, { recursive: true });

  return multer.diskStorage({
    destination: dir,
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      callback(null, uniqueName);
    },
  });
}

export function imageUpload(subfolder: string) {
  return multer({
    storage: storageFor(subfolder),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        callback(new ApiError(400, "დაშვებულია მხოლოდ სურათის ფაილები (jpg, png, webp, gif)"));
        return;
      }
      callback(null, true);
    },
  });
}

export function publicUrlFor(subfolder: string, filename: string): string {
  return `/uploads/${subfolder}/${filename}`;
}
