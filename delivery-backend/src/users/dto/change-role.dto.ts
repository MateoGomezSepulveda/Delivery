import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/auth/roles.enum';

export class ChangeRoleDto {
    @ApiProperty({ enum: Role, example: Role.DELIVERY })
    @IsEnum(Role)
    role: Role;
}
