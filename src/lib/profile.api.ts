import axios from "axios";
import axiosInstance from "@/lib/axios";
import type { BackendUser, ApiResponse } from "@/types/auth";

export const SELF_PROFILE_PICTURE_UNAVAILABLE_MESSAGE =
  "Perubahan foto profil mandiri belum tersedia untuk role ini pada backend.";

export const updateSelfProfilePicture = async (payload: {
  userId: number;
  profilePicture: File;
}) => {
  const uploadViaUsersUpdate = async () => {
    const formData = new FormData();
    formData.append("user[profile_picture]", payload.profilePicture);

    const response = await axiosInstance.patch<ApiResponse<BackendUser>>(
      `/api/v1/users/${payload.userId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data.data;
  };

  try {
    return await uploadViaUsersUpdate();
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const status = error.response?.status;
    if ([403, 404, 405].includes(status || 0)) {
      throw new Error(SELF_PROFILE_PICTURE_UNAVAILABLE_MESSAGE);
    }

    throw error;
  }
};
