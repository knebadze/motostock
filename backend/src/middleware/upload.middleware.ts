import multer from "multer";
import type { RequestHandler } from "express";
import { ApiError } from "../lib/ApiError.js";
import { rejectNullBytesInBody } from "./null-byte.middleware.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// multer fills req.body's text fields only while parsing, after the global
// null-byte guard (app.ts) has already run — so each upload middleware runs
// the same check right after it. Returns handler arrays (Express flattens
// them), keeping the `imageUpload().single("image")` call sites unchanged.
function withNullByteCheck(instance: multer.Multer) {
  return {
    single: (fieldName: string): RequestHandler[] => [instance.single(fieldName), rejectNullBytesInBody],
    array: (fieldName: string, maxCount?: number): RequestHandler[] => [
      instance.array(fieldName, maxCount),
      rejectNullBytesInBody,
    ],
  };
}

export function imageUpload() {
  return withNullByteCheck(
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          callback(new ApiError(400, "დაშვებულია მხოლოდ სურათის ფაილები (jpg, png, webp, gif)"));
          return;
        }
        callback(null, true);
      },
    }),
  );
}

// .xlsx only (the modern Office Open XML mimetype) — exceljs (see
// vehicle-catalog-bulk-import.service.ts) doesn't read the legacy binary
// .xls format, so rejecting it here gives a clearer error than a parse
// failure would later. Memory storage, same as imageUpload() — the buffer
// is parsed in-place and never needs to touch disk.
const SPREADSHEET_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function spreadsheetUpload() {
  return withNullByteCheck(
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        // The browser takes the type from the OS: a computer without Excel
        // (or with an odd file association) sends a .xlsx as a generic
        // binary/zip — accepted by its extension then. The content itself
        // is still checked when exceljs parses it (a non-xlsx fails there
        // with a clear 400).
        const genericType = ["", "application/octet-stream", "application/zip", "application/x-zip-compressed"].includes(
          file.mimetype,
        );
        const isXlsx =
          file.mimetype === SPREADSHEET_MIME_TYPE || (genericType && /\.xlsx$/i.test(file.originalname));
        if (!isXlsx) {
          callback(new ApiError(400, "დაშვებულია მხოლოდ Excel (.xlsx) ფაილები"));
          return;
        }
        callback(null, true);
      },
    }),
  );
}
