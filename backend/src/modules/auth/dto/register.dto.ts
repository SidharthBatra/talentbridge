import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'jane@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3curePass!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    enum: Role,
    description:
      'Role selectable at signup for the demo. In production, non-CANDIDATE ' +
      'roles would be invite-only and this field ignored for self-signup.',
    default: Role.CANDIDATE,
  })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({
    required: false,
    format: 'uuid',
    description: 'Company scope for recruiter/hiring-manager/admin roles',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
