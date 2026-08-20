import { isNilOrEmpty, omitBy, size, uuid } from "..";
import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { ICentrifugalService } from "./i-centrifugal.service";
import { CentrifugalServiceOptions } from "./options";
import { JwtService } from "@nestjs/jwt";
import {
  CentrifugalTokenPayload,
  SubscribeRequest,
  UnsubscribeRequest,
  DisconnectRequest,
  RefreshRequest,
  HistoryRequest,
  PresenceRequest,
  PresenceStatsRequest,
  TokenOptions,
  PublishOptions,
  CentrifugalError,
  CentrifugalErrorCode,
  CentrifugalRequest,
  CentrifugalMethod,
  PublishResponse,
  SubscribeResponse,
  UnsubscribeResponse,
  DisconnectResponse,
  RefreshResponse,
  HistoryResponse,
  PresenceResponse,
  PresenceStatsResponse,
  ChannelNamespace,
  CentrifugalResponse,
  PublishRequest,
  RPCRequest,
  BatchPublishResult,
} from "./domain";
import { CHANNEL_NAME_REGEX, MAX_CHAR_LENGTH, MAX_TOKEN_EXPIRY, HOURS_IN_ONE_DAY, SECOND, HOUR_IN_SECONDS, EXPONENTIAL_BASE } from "./constants";
import { isBase64 } from "class-validator";
import axios, { AxiosError } from "axios";
import { CentrifugalException } from "./centrifugal.exception";

@Injectable()
export class CentrifugalService implements ICentrifugalService {
  private readonly defaultTokenExpiry = HOURS_IN_ONE_DAY * HOUR_IN_SECONDS;
  private readonly maxRetries = 3;
  private readonly retryDelay = SECOND;
  private readonly maxTokenExpiry = MAX_TOKEN_EXPIRY;
  private readonly maxLength = MAX_CHAR_LENGTH;
  private readonly channelNameRegX = CHANNEL_NAME_REGEX;

  constructor(protected readonly options: CentrifugalServiceOptions, protected readonly jwtService: JwtService, protected readonly logger: PinoLogger) {
    this.validateOptions();
  }
  /**
   * Generate a JWT client token for a user with enhanced options
   * @param payload - token payload with user info and options
   * @param options - additional token options
   */
  public generateClientToken(payload: CentrifugalTokenPayload, options: TokenOptions = {}): string {
    try {
      this.validateId(payload.id);

      const jti = uuid();
      const now = Math.floor(Date.now() / SECOND);
      const expiresIn = options.expiresIn ?? this.defaultTokenExpiry;

      // Validate expiry time
      if (expiresIn <= 0 || expiresIn > this.maxTokenExpiry) {
        throw this.createError("Invalid token expiry time", CentrifugalErrorCode.INVALID_EXPIRY);
      }

      const channels = options.channels ?? payload.channels;
      const tokenPayload = {
        jti,
        sub: payload.id,
        iat: now,
        exp: now + expiresIn,
        ...(payload.info && { info: payload.info }),
        ...(options.b64info && { b64info: options.b64info }),
        ...(channels && { channels }),
      };

      const token = this.jwtService.sign(tokenPayload, {
        secret: this.options.secretKey,
      });

      this.logger.debug({ id: payload.id, expiresIn, channelsCount: payload.channels?.length || 0 }, "Generated Centrifugal client token");

      return token;
    } catch (err) {
      this.logger.error({ err, id: payload.id }, "Error generating Centrifugal client token");
      throw err;
    }
  }

  /**
   * Publish a message to a channel with options
   * @param channel - channel name
   * @param data - message payload
   * @param options - publish options
   */
  public async publish<T extends object>(channel: string, data: T, options: PublishOptions = {}): Promise<PublishResponse> {
    try {
      this.validateChannel(channel);

      // Remove null or undefined keys from options
      const filteredOptions = omitBy(options, isNilOrEmpty);

      if (filteredOptions.b64data && !isBase64(filteredOptions.b64data)) {
        throw new CentrifugalException(CentrifugalErrorCode.INVALID_BASE64);
      }

      const requestBody: CentrifugalRequest<PublishRequest> = {
        method: CentrifugalMethod.PUBLISH,
        params: {
          channel,
          data,
          ...filteredOptions,
        },
      };

      const response = await this.makeRequest<PublishResponse>(requestBody);

      this.logger.debug({ channel, dataSize: JSON.stringify(data).length }, "Published message to Centrifugal channel");

      return response;
    } catch (err) {
      this.logger.error({ err, channel }, `Error publishing to Centrifugal channel ${channel}`);
      throw err;
    }
  }

  /**
   * Subscribe user to channel
   */
  public async subscribe(request: SubscribeRequest): Promise<SubscribeResponse> {
    try {
      this.validateId(request.user);
      this.validateChannel(request.channel);

      const requestBody: CentrifugalRequest<SubscribeRequest> = {
        method: CentrifugalMethod.SUBSCRIBE,
        params: request,
      };

      return await this.makeRequest<SubscribeResponse>(requestBody);
    } catch (err) {
      this.logger.error({ err, user: request.user, channel: request.channel }, "Error subscribing user to channel");
      throw err;
    }
  }

  /**
   * Unsubscribe user from channel
   */
  public async unsubscribe(request: UnsubscribeRequest): Promise<UnsubscribeResponse> {
    try {
      this.validateId(request.user);
      this.validateChannel(request.channel);

      const requestBody: CentrifugalRequest<UnsubscribeRequest> = {
        method: CentrifugalMethod.UNSUBSCRIBE,
        params: request,
      };

      return await this.makeRequest<UnsubscribeResponse>(requestBody);
    } catch (err) {
      this.logger.error({ err, user: request.user, channel: request.channel }, "Error unsubscribing user from channel");
      throw err;
    }
  }

  /**
   * Disconnect user
   */
  public async disconnect(request: DisconnectRequest): Promise<DisconnectResponse> {
    try {
      this.validateId(request.user);

      const requestBody: CentrifugalRequest<DisconnectRequest> = {
        method: CentrifugalMethod.DISCONNECT,
        params: request,
      };

      return await this.makeRequest<DisconnectResponse>(requestBody);
    } catch (err) {
      this.logger.error({ err, user: request.user }, "Error disconnecting user");
      throw err;
    }
  }

  /**
   * Refresh user connection
   */
  public async refresh(request: RefreshRequest): Promise<RefreshResponse> {
    try {
      this.validateId(request.user);

      const requestBody: CentrifugalRequest<RefreshRequest> = {
        method: CentrifugalMethod.REFRESH,
        params: request,
      };

      return await this.makeRequest<RefreshResponse>(requestBody);
    } catch (err) {
      this.logger.error({ err, user: request.user }, "Error refreshing user connection");
      throw err;
    }
  }

  /**
   * Get channel history
   */
  public async history(request: HistoryRequest): Promise<HistoryResponse> {
    try {
      this.validateChannel(request.channel);

      const requestBody: CentrifugalRequest<HistoryRequest> = {
        method: CentrifugalMethod.HISTORY,
        params: request,
      };

      return await this.makeRequest<HistoryResponse>(requestBody);
    } catch (err) {
      this.logger.error({ err, channel: request.channel }, "Error getting channel history");
      throw err;
    }
  }

  /**
   * Get channel presence information
   */
  public async presence(request: PresenceRequest): Promise<PresenceResponse> {
    try {
      this.validateChannel(request.channel);

      const requestBody: CentrifugalRequest<PresenceRequest> = {
        method: CentrifugalMethod.PRESENCE,
        params: request,
      };

      return await this.makeRequest<PresenceResponse>(requestBody);
    } catch (err) {
      this.logger.error({ err, channel: request.channel }, "Error getting channel presence");
      throw err;
    }
  }

  /**
   * Get channel presence statistics
   */
  public async presenceStats(request: PresenceStatsRequest): Promise<PresenceStatsResponse> {
    try {
      this.validateChannel(request.channel);

      const requestBody: CentrifugalRequest<PresenceStatsRequest> = {
        method: CentrifugalMethod.PRESENCE_STATS,
        params: request,
      };

      return await this.makeRequest<PresenceStatsResponse>(requestBody);
    } catch (err) {
      this.logger.error({ err, channel: request.channel }, "Error getting channel presence stats");
      throw err;
    }
  }

  /**
   * Publish to multiple channels at once
   */
  public async publishBatch<TPayload extends object = Record<string, unknown>>(publications: Array<{ channel: string; data: TPayload; options?: PublishOptions }>): Promise<BatchPublishResult[]> {
    const settled = await Promise.allSettled(publications.map((pub) => this.publish(pub.channel, pub.data, pub.options)));

    const results: BatchPublishResult[] = settled.map((outcome, index) => ({
      channel: publications[index].channel,
      ...(outcome.status === "fulfilled" ? { result: outcome.value } : { error: outcome.reason }),
    }));

    const failCount = results.filter((rr) => rr.error !== undefined).length;
    if (failCount > 0) {
      this.logger.warn({ failCount, totalCount: publications.length }, "Some batch publications failed");
    }

    return results;
  }
  /**
   * Generate a user-specific channel with validation
   * @param identity - channel id or name
   */
  public getChannel(nameSpace: ChannelNamespace, identity: string): string {
    this.validateChannel(identity);
    return `${nameSpace}:${identity}`;
  }
  /**
   * Generate a user-specific channel with validation
   * @param userId - user id
   */
  public getUserChannel(userId: string): string {
    return this.getChannel(ChannelNamespace.USER, userId);
  }

  /**
   * Generate a room-specific channel with validation
   * @param roomId - room id
   */
  public getRoomChannel(roomId: string): string {
    return this.getChannel(ChannelNamespace.ROOM, roomId);
  }

  /**
   * Generate a broadcast channel with validation
   * @param name - broadcast channel name
   */
  public getBroadcastChannel(name: string): string {
    return this.getChannel(ChannelNamespace.BROADCAST, name);
  }

  /**
   * Generate a namespace-specific channel
   * @param namespace - namespace
   * @param identifier - channel identifier
   */
  public getNamespacedChannel(namespace: string, identifier: string): string {
    if (isNilOrEmpty(namespace)) {
      throw this.createError("Namespace is required and must be a string", CentrifugalErrorCode.INVALID_NAMESPACE);
    }
    if (isNilOrEmpty(identifier)) {
      throw this.createError("Channel identifier is required and must be a string", CentrifugalErrorCode.INVALID_IDENTIFIER);
    }
    return `${namespace}:${identifier}`;
  }

  /**
   * Check if service is healthy by making a test API call
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const requestBody: CentrifugalRequest<RPCRequest> = {
        method: CentrifugalMethod.INFO,
        params: {},
      };

      await this.makeRequest<Record<string, unknown>>(requestBody);
      return true;
    } catch (err) {
      this.logger.error({ err }, "Centrifugal health check failed");
      return false;
    }
  }

  /**
   * Validate service configuration
   */
  private validateOptions(): void {
    if (isNilOrEmpty(this.options.secretKey)) {
      throw new Error("Centrifugal secret key is required");
    }
    if (isNilOrEmpty(this.options.apiUrl)) {
      throw new Error("Centrifugal API URL is required");
    }
    if (isNilOrEmpty(this.options.httpApiKey)) {
      throw new Error("Centrifugal HTTP API key is required");
    }
  }

  /**
   * Create a custom error with additional context
   */
  private createError(message: string, code?: CentrifugalErrorCode, statusCode?: number, context?: Record<string, unknown>): CentrifugalError {
    const error = new Error(message) as CentrifugalError;
    error.code = code;
    error.statusCode = statusCode;
    error.context = context;
    return error;
  }

  /**
   * Sleep for a specified amount of time
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make HTTP request with proper generic typing and retry logic
   * @param body - request body
   * @param retryCount - current retry count
   */
  private async makeRequest<TResponse>(payload: CentrifugalRequest, retryCount = 0): Promise<TResponse> {
    try {
      const body: CentrifugalRequest["params"] = payload.params;
      const response = await axios.post<TResponse>(`${this.options.apiUrl}/api/${payload.method}`, body, {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.options.httpApiKey,
        },
        validateStatus: () => true, // we'll handle non-2xx manually
      });

      if (response.status < 200 || response.status >= 300) {
        if (response.status >= 500 && retryCount < this.maxRetries) {
          this.logger.warn({ statusCode: response.status, retryCount }, `HTTP ${response.status}, retrying request (${retryCount + 1}/${this.maxRetries})`);
          await this.sleep(this.retryDelay * Math.pow(EXPONENTIAL_BASE, retryCount));
          return this.makeRequest<TResponse>(payload, retryCount + 1);
        }

        throw this.createError(`HTTP ${response.status}: ${response.statusText}`, CentrifugalErrorCode.HTTP_ERROR, response.status, {
          responseBody: response.data ?? "Unknown error",
        });
      }

      // Handle Centrifugo API response structure
      const apiResponse: CentrifugalResponse<TResponse> = response.data;

      // Check for API-level errors
      if (apiResponse.error) {
        throw this.createError(`Centrifugo API Error: ${apiResponse.error.message}`, CentrifugalErrorCode.API_ERROR, apiResponse.error.code, { apiError: apiResponse.error });
      }

      // Return the result field, or the whole response if no result field
      return apiResponse.result !== undefined ? apiResponse.result : (apiResponse as TResponse);
    } catch (err) {
      const error = err as AxiosError;

      // Handle network errors (ECONNREFUSED, ETIMEDOUT, etc.)
      if (retryCount < this.maxRetries && (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT")) {
        this.logger.warn({ error: error.message, retryCount }, `Connection error, retrying request (${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(this.retryDelay * Math.pow(EXPONENTIAL_BASE, retryCount));
        return this.makeRequest<TResponse>(payload, retryCount + 1);
      }

      throw err;
    }
  }

  /**
   * Validate channel name
   */
  private validateChannel(channel: string): void {
    if (isNilOrEmpty(channel)) {
      throw this.createError("Channel name is required and must be a string", CentrifugalErrorCode.INVALID_CHANNEL);
    }
    if (channel.length > this.maxLength) {
      throw this.createError(`Channel name too long (max ${this.maxLength} characters)`, CentrifugalErrorCode.CHANNEL_TOO_LONG);
    }
    if (!this.channelNameRegX.test(channel)) {
      throw this.createError("Channel name contains invalid characters", CentrifugalErrorCode.INVALID_CHANNEL_FORMAT);
    }
  }
  /**
   * Validate user ID
   */
  private validateId(id: string): void {
    if (isNilOrEmpty(id)) {
      throw this.createError("User ID is required and must be a string", CentrifugalErrorCode.INVALID_USER_ID);
    }

    if (size(id) > this.maxLength) {
      throw this.createError(`User ID too long (max ${this.maxLength} characters)`, CentrifugalErrorCode.USER_ID_TOO_LONG);
    }
  }
}
