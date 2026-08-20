import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthCommandHandlers } from './commands';
import { AuthQueryHandlers } from './queries';
import { AuthProfile } from './mapper';
import { ClerkJwtStrategy, ClerkService, RolesGuard, CLERK_STRATEGY, CLERK_SERVICE } from '../../../common';
import { MailOptions } from '../../../common';
import { ICoreApiConfig } from '../../../configuration';
import {
  UserEntity,
  UserRoleEntity,
  OrgMemberEntity,
  RoleEntity,
  OrganizationEntity,
} from '../../../infrastructure/persistence/entities';
import { AuthMailService } from './mail';

@Module({
  imports: [
    CqrsModule,
    PassportModule.register({ defaultStrategy: CLERK_STRATEGY }),
    TypeOrmModule.forFeature([
      UserEntity,
      UserRoleEntity,
      OrgMemberEntity,
      RoleEntity,
      OrganizationEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide:    MailOptions,
      useFactory: (config: ConfigService<ICoreApiConfig>): MailOptions => {
        const cfg = config.get<ICoreApiConfig['mail']>('mail');
        return new MailOptions(cfg.host, cfg.port, cfg.secure, cfg.user, cfg.password, cfg.from);
      },
      inject: [ConfigService],
    },
    AuthMailService,
    ClerkJwtStrategy,
    ClerkService,
    { provide: CLERK_SERVICE, useExisting: ClerkService },
    RolesGuard,
    AuthProfile,
    ...AuthCommandHandlers,
    ...AuthQueryHandlers,
  ],
  exports: [ClerkJwtStrategy, RolesGuard, PassportModule],
})
export class AuthModule {}
