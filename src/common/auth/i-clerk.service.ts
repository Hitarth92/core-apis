import { EInvitationStatus } from '../../infrastructure/e-invitation-status';

export const CLERK_SERVICE = 'IClerkService';

export interface ClerkInvitationData {
  id: string;
  emailAddress: string;
  status: EInvitationStatus;
  roles?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ClerkUserData {
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  banned: boolean;
  roles: string[];
  createdAt: number;
  lastSignInAt: number | null;
}

export interface ClerkUserListData {
  data: ClerkUserData[];
  totalCount: number;
}

export interface ClerkOrganizationData {
  organizationId: string;
  name: string;
  slug: string;
}

export interface InviteMetadata {
  organizationId: string;
  roleId: string;
  locationId?: string;
}

export interface IClerkService {
  getTokenForUser(userId: string): Promise<string>;
  listUsersAsync(params?: { limit?: number; offset?: number; organizationId?: string }): Promise<ClerkUserListData>;
  searchUsersAsync(params: { query: string; limit?: number; offset?: number }): Promise<ClerkUserListData>;
  getClerkUserAsync(clerkUserId: string): Promise<ClerkUserData>;
  getUserRolesAsync(clerkUserId: string): Promise<string[]>;
  updateUserRolesAsync(clerkUserId: string, roles: string[]): Promise<void>;
  inviteUserAsync(params: { email: string; roles?: string[]; redirectUrl?: string; organizationId?: string; roleId?: string; locationId?: string }): Promise<void>;
  listInvitationsAsync(params?: { status?: EInvitationStatus }): Promise<ClerkInvitationData[]>;
  revokeInvitationAsync(invitationId: string): Promise<void>;
  deleteClerkUserAsync(clerkUserId: string): Promise<void>;
  banClerkUserAsync(clerkUserId: string): Promise<void>;
  unbanClerkUserAsync(clerkUserId: string): Promise<void>;
  assignToOrganizationAsync(params: { clerkUserId: string; organizationId: string; role: string }): Promise<void>;
  removeFromOrganizationAsync(params: { clerkUserId: string; organizationId: string }): Promise<void>;
  listOrganizationsAsync(): Promise<ClerkOrganizationData[]>;
  getInviteMetadataAsync(clerkUserId: string): Promise<InviteMetadata | undefined>;
}
