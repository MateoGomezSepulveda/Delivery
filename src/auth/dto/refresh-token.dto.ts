import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ example: 'some-refresh-token-string' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
