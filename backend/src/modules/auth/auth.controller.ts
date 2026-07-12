import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import { AuthTokensDto, MessageResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { RefreshRequestUser } from './strategies/jwt-refresh.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Role is selectable here for demo purposes. In production, ' +
      'non-CANDIDATE roles would be invite-only.',
  })
  @ApiCreatedResponse({ type: AuthTokensDto })
  register(@Body() dto: RegisterDto): Promise<AuthTokensDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in',
    description:
      'Returns an access token (15m) and refresh token (7d) in the body. ' +
      'The client stores the refresh token and sends it to /auth/refresh.',
  })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiBody({ type: RefreshDto })
  @ApiOperation({ summary: 'Exchange a valid refresh token for new tokens' })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalid or revoked' })
  refresh(@Req() req: { user: RefreshRequestUser }): Promise<AuthTokensDto> {
    return this.authService.refresh(req.user.sub, req.user.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth('access-token')
  @ApiBody({ type: RefreshDto })
  @ApiOperation({ summary: 'Revoke the presented refresh token' })
  @ApiOkResponse({ type: MessageResponseDto })
  async logout(
    @Req() req: { user: RefreshRequestUser },
  ): Promise<MessageResponseDto> {
    await this.authService.logout(req.user.sub, req.user.refreshToken);
    return { message: 'Logged out' };
  }
}
