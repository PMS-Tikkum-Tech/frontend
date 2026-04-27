import axiosInstance from "@/lib/axios";
import type { BackendUser, ApiResponse } from "@/types/auth";

export const updateSelfProfilePicture = async (payload: {
  userId: number;
  profilePicture: File;
}) => {
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
