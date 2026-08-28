import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

@Injectable()
export class UploadsService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET') || '';
    const region = this.configService.get<string>('AWS_S3_REGION') || '';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'general'): Promise<string> {
    try {
      // 1. Generar nombre de archivo único
      const fileExtension = file.originalname.split('.').pop();
      const uniqueFileName = `${folder}/${crypto.randomUUID()}.${fileExtension}`;

      // 2. Configurar los parámetros para S3
      const uploadParams = {
        Bucket: this.bucketName,
        Key: uniqueFileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      // 3. Subir el archivo
      await this.s3Client.send(new PutObjectCommand(uploadParams));

      // 4. Construir y retornar la URL pública del archivo
      const region = this.configService.get<string>('AWS_S3_REGION');
      const fileUrl = `https://${this.bucketName}.s3.${region}.amazonaws.com/${uniqueFileName}`;

      this.logger.log(`File uploaded successfully to: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      this.logger.error('Error uploading file to S3', error);
      throw new InternalServerErrorException('Error al subir el archivo a la nube');
    }
  }
}
