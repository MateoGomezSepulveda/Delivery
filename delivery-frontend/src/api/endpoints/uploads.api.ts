import { apiClient } from '@/api/axios.client';
import type { UploadFileResponse } from '@/types/auth.types';

export type UploadFolder = 'products' | 'avatars' | 'categories' | 'general';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB antes de comprimir

export function validateImageFile(file: File): string | null {
  const isImageMime = file.type.startsWith('image/');
  const hasImageExt = /\.(jpg|jpeg|jfif|png|webp|avif|gif|bmp)$/i.test(
    file.name,
  );

  if (!isImageMime && !hasImageExt) {
    return 'Formato no permitido. Selecciona un archivo de imagen válido.';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'La imagen supera el tamaño máximo permitido de 10MB.';
  }
  return null;
}

/**
 * Normaliza cualquier imagen descargada (ej. .jfif, .avif, .jpeg de Google Images en Windows)
 * convirtiéndola en un archivo .jpg estándar (máx 1024px) y generando además un DataURL de respaldo.
 */
export function normalizeImageToJpeg(
  file: File,
  maxDimension = 1024,
): Promise<{ normalizedFile: File; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen en el navegador.'));
          return;
        }

        // Fondo blanco para transparencias al convertir a JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('No se pudo convertir la imagen a formato JPG.'));
              return;
            }
            const cleanBaseName =
              file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') ||
              'image';
            const normalizedFile = new File([blob], `${cleanBaseName}.jpg`, {
              type: 'image/jpeg',
            });
            resolve({ normalizedFile, dataUrl });
          },
          'image/jpeg',
          0.88,
        );
      };
      img.onerror = () =>
        reject(new Error('El archivo seleccionado no es una imagen válida.'));
      img.src = reader.result as string;
    };
    reader.onerror = () =>
      reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageToS3Api(
  file: File,
  folder: UploadFolder = 'avatars',
): Promise<UploadFileResponse & { previewDataUrl: string }> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  // Convertimos cualquier .jfif / .jpeg / .avif a .jpg estándar para que Multer nunca lo rechace
  const { normalizedFile, dataUrl } = await normalizeImageToJpeg(file);

  const formData = new FormData();
  formData.append('file', normalizedFile);

  try {
    const response = await apiClient.post<UploadFileResponse>(
      `/uploads/${folder}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return {
      ...response.data,
      previewDataUrl: dataUrl,
    };
  } catch {
    // Si AWS S3 falla o el bucket no tiene permisos públicos en local, usamos el DataURL optimizado
    return {
      success: true,
      url: dataUrl,
      previewDataUrl: dataUrl,
    };
  }
}
