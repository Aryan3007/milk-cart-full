import { cloudinary } from "../config/cloudinary.js";

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
export const extractPublicId = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;

  // Extract public ID from URL
  const urlParts = url.split("/");
  const uploadIndex = urlParts.indexOf("upload");

  if (uploadIndex === -1) return null;

  // Get the part after version (if exists) or after upload
  let publicIdPart = urlParts.slice(uploadIndex + 1).join("/");

  // Remove version if exists (starts with 'v' followed by numbers)
  if (publicIdPart.match(/^v\d+\//)) {
    publicIdPart = publicIdPart.replace(/^v\d+\//, "");
  }

  // Remove file extension
  const publicId = publicIdPart.replace(/\.[^/.]+$/, "");

  return publicId;
};

/**
 * Delete image from Cloudinary
 * @param {string} imageUrl - Cloudinary URL
 * @returns {Promise<boolean>} - Success status
 */
export const deleteImage = async (imageUrl) => {
  try {
    const publicId = extractPublicId(imageUrl);

    if (!publicId) {
      console.warn("Could not extract public ID from URL:", imageUrl);
      return false;
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      console.log("Image deleted successfully:", publicId);
      return true;
    } else {
      console.warn("Failed to delete image:", result);
      return false;
    }
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return false;
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {string[]} imageUrls - Array of Cloudinary URLs
 * @returns {Promise<{success: string[], failed: string[]}>} - Results
 */
export const deleteMultipleImages = async (imageUrls) => {
  const results = {
    success: [],
    failed: [],
  };

  for (const url of imageUrls) {
    const success = await deleteImage(url);
    if (success) {
      results.success.push(url);
    } else {
      results.failed.push(url);
    }
  }

  return results;
};

/**
 * Upload image to Cloudinary (if needed for direct uploads)
 * @param {Buffer|string} imageBuffer - Image buffer or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result
 */
export const uploadImage = async (imageBuffer, options = {}) => {
  try {
    const uploadOptions = {
      folder: "milkcart_products",
      transformation: [
        {
          width: 800,
          height: 800,
          crop: "limit",
          quality: "auto:good",
          fetch_format: "auto",
        },
      ],
      ...options,
    };

    const result = await cloudinary.uploader.upload(imageBuffer, uploadOptions);
    return result;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  }
};
