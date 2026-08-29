import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLocationDto {
    @ApiProperty({ example: 4.7110 })
    @IsNumber()
    lat: number;

    @ApiProperty({ example: -74.0721 })
    @IsNumber()
    lng: number;
}
