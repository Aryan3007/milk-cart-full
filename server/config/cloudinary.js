import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// Configure Cloudinary
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error("❌ Missing Cloudinary environment variables!");
  console.error("Please check your .env file contains:");
  console.error("- CLOUDINARY_CLOUD_NAME");
  console.error("- CLOUDINARY_API_KEY");
  console.error("- CLOUDINARY_API_SECRET");
} else {
  console.log("✅ Cloudinary configuration loaded successfully");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "milkcart_products", // Folder name in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"], // Allowed file formats
    transformation: [
      {
        width: 800,
        height: 800,
        crop: "limit",
        quality: "auto:good",
        fetch_format: "auto",
      },
    ],
  },
});

// Create multer upload instance with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

export default upload;
export { cloudinary };
