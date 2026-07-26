import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { ApiError } from "./ApiError.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `motostock/${folder}` },
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
