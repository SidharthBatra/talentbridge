import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthTokensDto {
  @ApiProperty({ description: 'JWT access token (15 min expiry)' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token (7 day expiry)' })
  refreshToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class AccessTokenDto {
  @ApiProperty({ description: 'A freshly minted JWT access token' })
  accessToken: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Logged out' })
  message: string;
}
