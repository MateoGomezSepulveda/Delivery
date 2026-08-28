import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post(':folder')
  @ApiOperation({ summary: 'Subir una imagen a AWS S3' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen a subir (jpg, jpeg, png, webp)',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
          return callback(
            new BadRequestException(
              'Solo se permiten imágenes (JPG, PNG, WEBP)',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // Limitar a 5MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Param('folder') folder: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo válido');
    }

    // Asegurarnos de que el folder sea uno de los permitidos
    const allowedFolders = ['products', 'avatars', 'categories', 'general'];
    if (!allowedFolders.includes(folder)) {
      throw new BadRequestException(
        `El folder debe ser uno de: ${allowedFolders.join(', ')}`,
      );
    }

    const url = await this.uploadsService.uploadFile(file, folder);

    return {
      success: true,
      url,
    };
  }
}
