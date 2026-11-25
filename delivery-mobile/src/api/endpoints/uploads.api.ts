import { apiClient } from '@/api/axios.client';
import type { UploadFileResponse } from '@/types/auth.types';

export type UploadFolder = 'products' | 'avatars' | 'categories' | 'general';

export interface NativeImageAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function uploadImageToS3Api(
  asset: NativeImageAsset,
  folder: UploadFolder = 'avatars',
): Promise<UploadFileResponse> {
  if (!asset.uri) {
    throw new Error('Selecciona una imagen válida desde tu dispositivo.');
  }

  if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error('La imagen supera el tamaño máximo permitido de 10MB.');
  }

  const fileName =
    asset.fileName?.replace(/[^a-zA-Z0-9._-]/g, '_') || `avatar_${Date.now()}.jpg`;
  const mimeType = asset.mimeType || 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const response = await apiClient.post<UploadFileResponse>(
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
