import {
  BatchPublishResult,
  CentrifugalTokenPayload,
  ChannelNamespace,
  DisconnectRequest,
  DisconnectResponse,
  HistoryRequest,
  HistoryResponse,
  PresenceRequest,
  PresenceResponse,
  PresenceStatsRequest,
  PresenceStatsResponse,
  PublishOptions,
  PublishResponse,
  RefreshRequest,
  RefreshResponse,
  SubscribeRequest,
  SubscribeResponse,
  TokenOptions,
  UnsubscribeRequest,
  UnsubscribeResponse,
} from "./domain";

export const CENTRIFUGAL_SERVICE = "ICentrifugalService";

export interface ICentrifugalService {
  // Token management
  generateClientToken(payload: CentrifugalTokenPayload, options?: TokenOptions): string;

  // Publishing methods
  publish<TPayload extends object = Record<string, unknown>>(channel: string, data: TPayload, options?: PublishOptions): Promise<PublishResponse>;
  publishBatch<TPayload extends object = Record<string, unknown>>(publications: Array<{ channel: string; data: TPayload; options?: PublishOptions }>): Promise<BatchPublishResult[]>;

  // Connection management
  subscribe(request: SubscribeRequest): Promise<SubscribeResponse>;
  unsubscribe(request: UnsubscribeRequest): Promise<UnsubscribeResponse>;
  disconnect(request: DisconnectRequest): Promise<DisconnectResponse>;
  refresh(request: RefreshRequest): Promise<RefreshResponse>;

  // Channel information
  history(request: HistoryRequest): Promise<HistoryResponse>;
  presence(request: PresenceRequest): Promise<PresenceResponse>;
  presenceStats(request: PresenceStatsRequest): Promise<PresenceStatsResponse>;

  // Channel helpers
  getChannel(nameSpace: ChannelNamespace, identity: string): string;
  getUserChannel(userId: string): string;
  getRoomChannel(roomId: string): string;
  getBroadcastChannel(name: string): string;
  getNamespacedChannel(namespace: string, identifier: string): string;

  // Utility methods
  healthCheck(): Promise<boolean>;
}
