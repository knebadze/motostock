import multer from "multer";
import { ApiError } from "../lib/ApiError.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function imageUpload() {
  return multer({
    storage: multer.memoryStorage(),
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
