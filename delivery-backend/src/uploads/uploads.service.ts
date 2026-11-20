import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

export interface DetectedImageSignature {
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  ext: 'jpg' | 'png' | 'webp';
}

@Injectable()
export class UploadsService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly cloudFrontDomain: string;
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly configService: ConfigService) {
    this.bucketName = (
      this.configService.get<string>('AWS_S3_BUCKET') ||
      this.configService.get<string>('AWS_S3_BUCKET_NAME') ||
      ''
    ).trim();
    this.region = (
      this.configService.get<string>('AWS_S3_REGION') || ''
    ).trim();
    this.cloudFrontDomain = (
      this.configService.get<string>('AWS_CLOUDFRONT_DOMAIN') || ''
    )
      .trim()
      .replace(/\/+$/, '');
    const accessKeyId =
      this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
    const secretAccessKey =
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Valida la firma binaria real (magic bytes) del archivo para prevenir subida de archivos
   * maliciosos renombrados a .jpg/.png/.webp.
   */
  detectImageSignature(buffer?: Buffer): DetectedImageSignature | null {
    if (!buffer || buffer.length < 4) {
      return null;
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { mime: 'image/jpeg', ext: 'jpg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { mime: 'image/png', ext: 'png' };
    }

    // WEBP: "RIFF" + 4 bytes + "WEBP"
    if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return { mime: 'image/webp', ext: 'webp' };
    }

    return null;
  }

  private buildPublicUrl(key: string): string {
    if (this.cloudFrontDomain) {
      const base = this.cloudFrontDomain.startsWith('http')
        ? this.cloudFrontDomain
        : `https://${this.cloudFrontDomain}`;
      return `${base}/${key}`;
    }
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Extrae la clave del objeto S3 únicamente si la URL corresponde a nuestro bucket o CloudFront.
   * Ignora data URLs (base64) o URLs externas (Unsplash, Google Avatars, etc.).
   */
  extractS3KeyFromUrl(fileUrl?: string | null): string | null {
    if (!fileUrl || !fileUrl.startsWith('http')) {
      return null;
    }

    try {
      const parsed = new URL(fileUrl);
      const allowedHosts = new Set<string>();
      if (this.bucketName) {
        allowedHosts.add(`${this.bucketName}.s3.amazonaws.com`);
        if (this.region) {
          allowedHosts.add(
            `${this.bucketName}.s3.${this.region}.amazonaws.com`,
          );
        }
      }
      if (this.cloudFrontDomain) {
        const cfHost = this.cloudFrontDomain
          .replace(/^https?:\/\//i, '')
          .split('/')[0];
        if (cfHost) allowedHosts.add(cfHost);
      }

      if (!allowedHosts.has(parsed.host)) {
        return null;
      }

      const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
      return key || null;
    } catch {
      return null;
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<string> {
    const signature = this.detectImageSignature(file?.buffer);
    if (!signature) {
      throw new BadRequestException(
        'El archivo no corresponde a una imagen real válida (se requiere firma binaria JPEG, PNG o WEBP).',
      );
    }

    try {
      const uniqueFileName = `${folder}/${crypto.randomUUID()}.${signature.ext}`;

      const uploadParams = {
        Bucket: this.bucketName,
        Key: uniqueFileName,
        Body: file.buffer,
        ContentType: signature.mime,
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));

      const fileUrl = this.buildPublicUrl(uniqueFileName);
      this.logger.log(`File uploaded successfully to: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      this.logger.error('Error uploading file to S3', error);
      throw new InternalServerErrorException(
        'Error al subir el archivo a la nube',
      );
    }
  }

  /**
   * Elimina de AWS S3 una imagen previa cuando se reemplaza o borra un producto/avatar.
   * Es seguro frente a URLs externas o data URLs (retorna false sin lanzar error).
   */
  async deleteFile(fileUrl?: string | null): Promise<boolean> {
    const key = this.extractS3KeyFromUrl(fileUrl);
    if (!key || !this.bucketName) {
      return false;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      this.logger.log(`Archivo anterior eliminado de S3: ${key}`);
      return true;
    } catch (error) {
      this.logger.warn(`No se pudo eliminar el archivo previo de S3 (${key})`);
      this.logger.debug(error);
      return false;
    }
  }
}
