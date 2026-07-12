import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Role, description: 'New role to assign to the user' })
  @IsEnum(Role)
  role: Role;
}
