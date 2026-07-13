import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

/**
 * Real-time notification hub. Authenticates each socket with the same
 * access-token secret/verification Module 1's JwtStrategy uses (via
 * JwtService + ConfigService) — no auth logic is reimplemented here, only
 * invoked over a socket handshake instead of an HTTP header.
 *
 * Rooms: `user:{userId}` and `role:{role}`, joined on connect, so any
 * module can target a notification at a specific user or an entire role
 * without knowing which sockets are online.
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        { secret: this.config.get<string>('jwt.accessSecret') },
      );

      client.data.userId = payload.sub;
      client.data.role = payload.role;
      client.join(`user:${payload.sub}`);
      client.join(`role:${payload.role}`);
    } catch {
      client.emit('error', new UnauthorizedException('Invalid or missing token').getResponse());
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  private extractToken(client: Socket): string {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    const fromHeader = client.handshake.headers?.authorization;
    const bearer =
      typeof fromHeader === 'string' && fromHeader.startsWith('Bearer ')
        ? fromHeader.slice('Bearer '.length)
        : undefined;
    const token = fromAuth ?? bearer;
    if (!token) {
      throw new UnauthorizedException('No token supplied');
    }
    return token;
  }

  emitApplicationStageChanged(
    candidateId: string,
    applicationId: string,
    stage: string,
  ): void {
    this.server
      .to(`user:${candidateId}`)
      .emit('application.stageChanged', { applicationId, stage });
  }

  emitInterviewReminder(
    candidateId: string,
    hiringManagerId: string,
    interviewId: string,
    applicationId: string,
    confirmedSlot: Date,
  ): void {
    const payload = { interviewId, applicationId, confirmedSlot };
    this.server.to(`user:${candidateId}`).emit('interview.reminder', payload);
    this.server
      .to(`user:${hiringManagerId}`)
      .emit('interview.reminder', payload);
  }

  /**
   * Stubbed entry point for Module 3's Offer flow — it can call this
   * directly (inject NotificationsGateway) once offers exist, without this
   * module needing to know anything about the Offer entity.
   */
  emitOfferResponded(
    recruiterId: string,
    offerId: string,
    applicationId: string,
    response: 'accepted' | 'rejected' | 'negotiating',
  ): void {
    this.server
      .to(`user:${recruiterId}`)
      .emit('offer.responded', { offerId, applicationId, response });
  }
}
