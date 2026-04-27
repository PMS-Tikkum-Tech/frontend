export const PROFILE_PICTURE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
];

export const PROFILE_PICTURE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const PROFILE_PICTURE_ACCEPT =
  ".png,.jpg,.jpeg,image/png,image/jpeg";

export const getProfilePictureValidationError = (file: File) => {
  if (!PROFILE_PICTURE_ALLOWED_TYPES.includes(file.type)) {
    return "Format foto harus PNG, JPG, atau JPEG.";
  }

  if (file.size > PROFILE_PICTURE_MAX_SIZE_BYTES) {
    return "Ukuran foto maksimal 5 MB.";
  }

  return null;
};
