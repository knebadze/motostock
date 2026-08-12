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

// .xlsx only (the modern Office Open XML mimetype) — exceljs (see
// vehicle-catalog-bulk-import.service.ts) doesn't read the legacy binary
// .xls format, so rejecting it here gives a clearer error than a parse
// failure would later. Memory storage, same as imageUpload() — the buffer
// is parsed in-place and never needs to touch disk.
const SPREADSHEET_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function spreadsheetUpload() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (file.mimetype !== SPREADSHEET_MIME_TYPE) {
        callback(new ApiError(400, "დაშვებულია მხოლოდ Excel (.xlsx) ფაილები"));
        return;
      }
      callback(null, true);
    },
  });
}
