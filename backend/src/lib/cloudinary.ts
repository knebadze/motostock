import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { ApiError } from "./ApiError.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

const MAX_DIMENSION = 1600;

export function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `motostock/${folder}`,
        // Resize only if larger than MAX_DIMENSION (never upscale), then let
        // Cloudinary pick the best compression/format per requesting browser.
        transformation: [
          { width: MAX_DIMENSION, height: MAX_DIMENSION, crop: "limit" },
          { quality: "auto:good", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(new ApiError(502, "სურათის ატვირთვა ღრუბლოვან სერვისზე ვერ მოხერხდა"));
          return;
        }
        resolve(result.secure_url);
      },
    );
    uploadStream.end(buffer);
  });
}
