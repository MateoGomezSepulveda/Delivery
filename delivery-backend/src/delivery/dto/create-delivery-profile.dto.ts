import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '../schemas/delivery-profile.schema';

export class CreateDeliveryProfileDto {
    @ApiProperty({ enum: VehicleType, example: VehicleType.MOTO })
    @IsEnum(VehicleType)
    vehicleType: VehicleType;

    @ApiPropertyOptional({ example: 'ABC-123' })
    @IsOptional()
    @IsString()
    plate?: string;
}
