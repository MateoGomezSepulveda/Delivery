import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FacebookAuthDto {
  @ApiPropertyOptional({
    description: 'Access Token de usuario emitido por Meta / Facebook',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Código de autorización OAuth 2.0 devuelto por Facebook Login',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description:
      'URI de redirección exacto usado al iniciar el flujo OAuth de Facebook',
  })
  @IsOptional()
  @IsString()
  redirectUri?: string;
}
