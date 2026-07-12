import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

/**
 * Admin user-management surface.
 *
 * The whole controller is guarded by JwtAuthGuard + RolesGuard and
 * restricted to ADMIN via `@Roles(Role.ADMIN)`. This is the reference
 * pattern other modules copy for their own protected routes.
 */
@ApiTags('Users (admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Caller is not an ADMIN' })
@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (ADMIN only)' })
  @ApiOkResponse({ type: [UserResponseDto] })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map(UserResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by id (ADMIN only)' })
  @ApiOkResponse({ type: UserResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.usersService.findById(id));
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update a user role (ADMIN only)' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(
      await this.usersService.updateRole(id, dto.role),
    );
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate (soft-disable) a user (ADMIN only)' })
  @ApiOkResponse({ type: UserResponseDto })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.usersService.deactivate(id));
  }
}
