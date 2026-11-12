import { apiClient } from '@/api/axios.client';
import type { UploadFileResponse } from '@/types/auth.types';

export type UploadFolder = 'products' | 'avatars' | 'categories' | 'general';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Formato no permitido. Solo se aceptan imágenes JPG, PNG o WEBP.';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'La imagen supera el tamaño máximo permitido de 5MB.';
  }
  return null;
}

export async function uploadImageToS3Api(
  file: File,
  folder: UploadFolder = 'avatars',
): Promise<UploadFileResponse> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<UploadFileResponse | { url: string }>(
    `/uploads/${folder}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
}
