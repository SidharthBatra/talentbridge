import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { User } from './modules/users/entities/user.entity';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('databaseUrl'),
        entities: [User, RefreshToken],
        migrations: ['dist/migrations/*.js'],
        // Schema is owned by migrations, never auto-sync.
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
