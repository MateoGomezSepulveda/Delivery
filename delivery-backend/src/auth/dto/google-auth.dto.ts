import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiPropertyOptional({
    description: 'ID Token (JWT) emitido por Google Identity Services',
  })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiPropertyOptional({
    description: 'Access Token OAuth 2.0 emitido por Google Identity Services',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;
}
