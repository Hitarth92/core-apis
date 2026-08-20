import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { createClerkClient } from '@clerk/backend';
import { passportJwtSecret } from 'jwks-rsa';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { ICoreApiConfig } from '../../../configuration';
import { UserEntity, UserRoleEntity, OrgMemberEntity } from '../../../infrastructure/persistence/entities';
import { CLERK_STRATEGY } from '../constants';
import { AuthenticatedUser, ClerkJwtPayload } from '../types';
import { computeHasOrgWideAccess } from '../org-wide-access';

@Injectable()
export class ClerkJwtStrategy extends PassportStrategy(Strategy, CLERK_STRATEGY) {
  private readonly clerkClient: ReturnType<typeof createClerkClient>;

  constructor(
    configService: ConfigService<ICoreApiConfig>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity) private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(OrgMemberEntity) private readonly orgMemberRepo: Repository<OrgMemberEntity>,
    @InjectPinoLogger(ClerkJwtStrategy.name) private readonly logger: PinoLogger,
  ) {
    const clerkCfg = configService.get<ICoreApiConfig['clerk']>('clerk');
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: clerkCfg.jwksUrl,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      ignoreExpiration: false,
    });
    this.clerkClient = createClerkClient({ secretKey: clerkCfg.secretKey });
  }

  public async validate(payload: ClerkJwtPayload): Promise<AuthenticatedUser> {
    const authUser = new AuthenticatedUser();
    authUser.clerkUserId = payload.sub;
    authUser.clerkOrgId = payload.o?.id;
    authUser.clerkOrgRole = payload.o?.rol;
    authUser.roles = [];
    authUser.locationIds = [];
    authUser.hasOrgWideAccess = false;

    if (payload.email) {
      authUser.email = payload.email;
      authUser.firstName = payload.firstName;
      authUser.lastName = payload.lastName;
      authUser.imageUrl = payload.imageUrl;
    } else {
      await this.enrichFromClerk(authUser, payload.sub);
    }

    if (!authUser.email) {
      throw new UnauthorizedException('Unable to resolve an email address for this Clerk account');
    }

    const dbUser = await this.userRepo.findOne({ where: { clerkUserId: payload.sub } });
    if (dbUser) {
      authUser.dbUserId = dbUser.id;
      authUser.organizationId = dbUser.organizationId ?? undefined;

      const userRoles = await this.userRoleRepo.find({
        where: { userId: dbUser.id },
        relations: ['role'],
      });
      const orgMembers = await this.orgMemberRepo.find({
        where: { userId: dbUser.id },
        relations: ['role'],
      });
      const systemRoles = userRoles.map((ur) => ur.role?.name).filter(Boolean);
      const orgRoles = orgMembers.map((om) => om.role?.name).filter(Boolean);
      authUser.roles = [...new Set([...systemRoles, ...orgRoles])];
      // Org memberships carry no location concept, so any membership grants org-wide access;
      // a user_roles row with locationId null does the same. Only non-null rows scope access.
      authUser.locationIds = [...new Set(userRoles.filter((ur) => ur.locationId).map((ur) => ur.locationId))];
      authUser.hasOrgWideAccess = computeHasOrgWideAccess(userRoles, orgMembers.length);
    }

    return authUser;
  }

  private async enrichFromClerk(authUser: AuthenticatedUser, clerkUserId: string): Promise<void> {
    const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
    // Password sign-in JWTs carry no email claim, so we look it up here. Clerk only
    // requires a *primary* email for OAuth accounts — password accounts can have an
    // attached, verified email that isn't marked primary, so fall back to that.
    const emails = clerkUser.emailAddresses;
    const chosen =
      emails.find((ea) => ea.id === clerkUser.primaryEmailAddressId) ??
      emails.find((ea) => ea.verification?.status === 'verified');
    authUser.email = chosen?.emailAddress;
    authUser.firstName = clerkUser.firstName ?? undefined;
    authUser.lastName = clerkUser.lastName ?? undefined;
    authUser.imageUrl = clerkUser.imageUrl ?? undefined;
  }
}
