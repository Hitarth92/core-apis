import { CentrifugalMethod } from "./enums";

export interface ApnsPushNotification {
  headers?: { [key: string]: string };
  payload?: object;
}

export interface BatchRequest {
  commands?: CentrifugoCommand[];
  parallel?: boolean;
}

export interface BlockUserRequest {
  expire_at?: number;
  user?: string;
}

export interface BoolValue {
  value?: boolean;
}

export interface BroadcastRequest {
  channels?: string[];
  data?: object;
  b64data?: string;
  skip_history?: boolean;
  tags?: { [key: string]: string };
  idempotency_key?: string;
  delta?: boolean;
}

export interface CancelPushRequest {
  uid?: string;
}

export interface ChannelsRequest {
  pattern?: string;
}

export interface CentrifugoCommand {
  publish?: PublishRequest;
  broadcast?: BroadcastRequest;
  subscribe?: SubscribeRequest;
  unsubscribe?: UnsubscribeRequest;
  disconnect?: DisconnectRequest;
  presence?: PresenceRequest;
  presence_stats?: PresenceStatsRequest;
  history?: HistoryRequest;
  history_remove?: HistoryRemoveRequest;
  info?: InfoRequest;
  rpc?: RPCRequest;
  refresh?: RefreshRequest;
  channels?: ChannelsRequest;
  connections?: ConnectionsRequest;
  update_user_status?: UpdateUserStatusRequest;
  get_user_status?: GetUserStatusRequest;
  delete_user_status?: DeleteUserStatusRequest;
  block_user?: BlockUserRequest;
  unblock_user?: UnblockUserRequest;
  revoke_token?: RevokeTokenRequest;
  invalidate_user_tokens?: InvalidateUserTokensRequest;
  device_register?: DeviceRegisterRequest;
  device_update?: DeviceUpdateRequest;
  device_remove?: DeviceRemoveRequest;
  device_list?: DeviceListRequest;
  device_topic_list?: DeviceTopicListRequest;
  device_topic_update?: DeviceTopicUpdateRequest;
  user_topic_list?: UserTopicListRequest;
  user_topic_update?: UserTopicUpdateRequest;
  send_push_notification?: SendPushNotificationRequest;
  update_push_status?: UpdatePushStatusRequest;
  cancel_push?: CancelPushRequest;
}

export interface ConnectionsRequest {
  user?: string;
  expression?: string;
}

export interface DeleteUserStatusRequest {
  users?: string[];
}

export interface DeviceFilter {
  ids?: string[];
  users?: string[];
  topics?: string[];
  providers?: string[];
  platforms?: string[];
}

export interface DeviceListRequest {
  filter?: DeviceFilter;
  include_total_count?: boolean;
  include_meta?: boolean;
  include_topics?: boolean;
  cursor?: string;
  limit?: number;
}

export interface DeviceLocaleUpdate {
  locale?: string;
}

export interface DeviceMetaUpdate {
  meta?: { [key: string]: string };
}

export interface DeviceRegisterRequest {
  id?: string;
  provider?: string;
  token?: string;
  platform?: string;
  user?: string;
  meta?: { [key: string]: string };
  topics?: string[];
  timezone?: string;
  locale?: string;
}

export interface DeviceRemoveRequest {
  ids?: string[];
  users?: string[];
}

export interface DeviceTimezoneUpdate {
  timezone?: string;
}

export interface DeviceTopicFilter {
  device_ids?: string[];
  device_providers?: string[];
  device_platforms?: string[];
  device_users?: string[];
  topics?: string[];
  topic_prefix?: string;
}

export interface DeviceTopicListRequest {
  filter?: DeviceTopicFilter;
  include_total_count?: boolean;
  include_device?: boolean;
  cursor?: string;
  limit?: number;
}

export interface DeviceTopicUpdateRequest {
  device_id?: string;
  op?: string; // add | remove | set
  topics?: string[];
}

export interface DeviceTopicsUpdate {
  op?: string; // add | remove | set
  topics?: string[];
}

export interface DeviceUpdateRequest {
  ids?: string[];
  users?: string[];
  user_update?: DeviceUserUpdate;
  meta_update?: DeviceMetaUpdate;
  topics_update?: DeviceTopicsUpdate;
  timezone_update?: DeviceTimezoneUpdate;
  locale_update?: DeviceLocaleUpdate;
}

export interface DeviceUserUpdate {
  user?: string;
}

export interface DisconnectRequest {
  user?: string;
  disconnect?: ApiDisconnect;
  client?: string;
  whitelist?: string[];
  session?: string;
}

export interface FcmPushNotification {
  message?: object;
}

export interface GetUserStatusRequest {
  users?: string[];
}

export interface HistoryRemoveRequest {
  channel?: string;
}

export interface HistoryRequest {
  channel?: string;
  limit?: number;
  since?: StreamPosition;
  reverse?: boolean;
}

export interface HmsPushNotification {
  message?: object;
}

export type InfoRequest = Record<string, never>;

export interface InvalidateUserTokensRequest {
  expire_at?: number;
  user?: string;
  issued_before?: number;
  channel?: string;
}

export interface PresenceRequest {
  channel?: string;
}

export interface PresenceStatsRequest {
  channel?: string;
}

export interface PublishRequest<T = object> {
  channel?: string;
  data?: T;
  b64data?: string;
  skip_history?: boolean;
  tags?: { [key: string]: string };
  idempotency_key?: string;
  delta?: boolean;
}

export interface PushLimitStrategy {
  rate_limit?: PushRateLimitStrategy;
  time_limit?: PushTimeLimitStrategy;
}

export interface PushLocalization {
  translations?: { [key: string]: string }; // variable name to value for the specific language/locale.
}

export interface PushNotification {
  fcm?: FcmPushNotification;
  hms?: HmsPushNotification;
  apns?: ApnsPushNotification;
  expire_at?: number; // timestamp in the future when Centrifugo should stop trying to send push notification.
}

export interface PushRateLimitStrategy {
  key?: string; // optional key for rate limit policy, supports variables.
  policies?: RateLimitPolicy[];
  drop_if_rate_limited?: boolean;
}

export interface PushRecipient {
  filter?: DeviceFilter;
  fcm_tokens?: string[];
  fcm_topic?: string;
  fcm_condition?: string;
  hms_tokens?: string[];
  hms_topic?: string;
  hms_condition?: string;
  apns_tokens?: string[];
}

export interface PushTimeLimitStrategy {
  send_after_time?: string; // HH:MM:SS
  send_before_time?: string; // HH:MM:SS
  no_tz_send_now?: boolean; // If device timezone is not set - send push now, by default will be dropped.
}

export interface RPCRequest {
  method?: string;
  params?: object;
}

export interface RateLimitPolicy {
  rate?: number;
  interval_ms?: number;
}

export interface RefreshRequest {
  user?: string;
  client?: string;
  expired?: boolean;
  expire_at?: number;
  info?: object;
  session?: string;
}

export interface RevokeTokenRequest {
  expire_at?: number;
  uid?: string;
}

export interface SendPushNotificationRequest {
  recipient?: PushRecipient;
  notification?: PushNotification;
  uid?: string; // unique identifier for each push notification request, can be used to cancel push.
  send_at?: number; // Unix seconds, if set - push will be sent at this time, if not set - immediately.
  optimize_for_reliability?: boolean; // makes processing heavier, but tolerates edge cases, like not losing inflight pushes due to temporary queue unavailability.
  limit_strategy?: PushLimitStrategy; // strategy for sending push notifications. Applicable only for pushes with filter recipient. When using this field Centrifugo processes devices one by one.
  analytics_uid?: string; // uid for push notification analytics, if not set - Centrifugo will use uid field.
  localizations?: { [key: string]: PushLocalization }; // optional per language/locale localizations for push notification.
  use_templating?: boolean; // if set - Centrifugo will use templating for push notification. Note that setting localizations enables templating automatically.
  use_meta?: boolean; // if set - Centrifugo will additionally load device meta during push sending, this meta becomes available in templating.
}

export interface StreamPosition {
  offset?: number;
  epoch?: string;
}

export interface SubscribeOptionOverride {
  presence?: BoolValue;
  join_leave?: BoolValue;
  force_recovery?: BoolValue;
  force_positioning?: BoolValue;
  force_push_join_leave?: BoolValue;
}

export interface SubscribeRequest {
  channel?: string;
  user?: string;
  expire_at?: number;
  info?: object;
  b64info?: string;
  client?: string;
  data?: object;
  b64data?: string;
  recover_since?: StreamPosition;
  override?: SubscribeOptionOverride;
  session?: string;
}

export interface UnblockUserRequest {
  user?: string;
}

export interface UnsubscribeRequest {
  channel?: string;
  user?: string;
  client?: string;
  session?: string;
}

export interface UpdatePushStatusRequest {
  analytics_uid?: string; // analytics uid of push notification (should match SendPushNotificationRequest.analytics_uid)
  status?: string; // delivered | interacted
  device_id?: string; // Centrifugo device id.
  msg_id?: string; // Provider issued message id.
}

export interface UpdateUserStatusRequest {
  users?: string[];
  state?: string;
}

export interface UserTopicFilter {
  users?: string[];
  topics?: string[];
  topic_prefix?: string;
}

export interface UserTopicListRequest {
  filter?: UserTopicFilter;
  include_total_count?: boolean;
  cursor?: string;
  limit?: number;
}

export interface UserTopicUpdateRequest {
  user?: string;
  op?: string; // add | remove | set
  topics?: string[];
}

export interface ApiDisconnect {
  code?: number;
  reason?: string;
}

export interface CentrifugalRequest<T = object> {
  method: CentrifugalMethod;
  params: T;
  id?: string;
  timestamp?: Date;
}
