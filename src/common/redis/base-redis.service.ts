import { OnApplicationBootstrap } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { createClient, RedisClientType } from "redis";

import { fromJson, toJson, isNilOrEmpty } from "..";
import { IBaseRedisService } from "./i-base-redis.service";
import { RedisException } from "./exceptions";
import { IRedisOptions } from "./options";
import { ServiceConnectionStatusCheck } from "../types/service-connection-status-check";

export abstract class BaseRedisService implements OnApplicationBootstrap, IBaseRedisService {
  private connected = false;
  private ready = false;
  private reconnecting = false;
  private reconnectionAttempts = 0;

  private redisClient: RedisClientType;

  protected constructor(protected readonly options: IRedisOptions, protected readonly logger: PinoLogger) {}

  // --------------------------------------------------------------------
  // Bootstrap
  // --------------------------------------------------------------------

  public async onApplicationBootstrap(): Promise<void> {
    this.logger.info(
      {
        host: this.options.host,
        port: this.options.port,
      },
      "Connecting to Redis",
    );

    this.createClient();
    this.addListeners();
    await this.startConnectionAsync();
  }

  public async connectAsync(): Promise<void> {
    return Promise.resolve();
  }

  // --------------------------------------------------------------------
  // Health / Status
  // --------------------------------------------------------------------

  public async checkConnectionStatusAsync(): Promise<ServiceConnectionStatusCheck> {
    if (!this.connected) {
      return ServiceConnectionStatusCheck.buildDisconnected("Not connected");
    }

    if (!this.ready) {
      return ServiceConnectionStatusCheck.buildConnected();
    }

    try {
      const pong = await this.redisClient.ping();
      this.logger.info({ pong }, "Redis ping successful");
      return ServiceConnectionStatusCheck.buildReady();
    } catch (ex) {
      this.logger.error({ error: ex }, "Redis ping failed");
      return ServiceConnectionStatusCheck.buildDisconnected(ex.message);
    }
  }

  // --------------------------------------------------------------------
  // Basic Operations
  // --------------------------------------------------------------------

  public async setAsync<T>(key: string, value: T, expiration?: number, prefix?: string): Promise<T> {
    try {
      key = !isNilOrEmpty(prefix) ? `${prefix}:${key}` : key;
      await this.redisClient.set(key, toJson(value), { EX: expiration });
      const result = await this.redisClient.get(key);
      return fromJson(result as any);
    } catch (ex) {
      this.logger.error({ error: ex, key }, "Redis SET failed");
      throw new RedisException(ex);
    }
  }

  public async getAsync<T>(key: string): Promise<T> {
    try {
      const raw = await this.redisClient.get(key);

      if (isNilOrEmpty(raw)) return null;

      return fromJson(raw as any);
    } catch (ex) {
      this.logger.error({ error: ex, key }, "Redis GET failed");
      throw new RedisException(ex);
    }
  }

  public async deleteAsync(key: string): Promise<boolean> {
    try {
      await this.redisClient.del(key);
      return true;
    } catch (ex) {
      this.logger.error({ error: ex, key }, "Redis DEL failed");
      throw new RedisException(ex);
    }
  }

  public async deleteBulkAsync(keys: string[]): Promise<number> {
    try {
      if (isNilOrEmpty(keys)) return 0;

      const count = await this.redisClient.del(keys);

      this.logger.info({ keys, count }, "Bulk keys deleted");
      return count;
    } catch (ex) {
      this.logger.error({ error: ex, keys }, "Redis bulk delete failed");
      throw new RedisException(ex);
    }
  }

  public async deleteByPrefixAsync(pattern: string): Promise<boolean> {
    try {
      if (isNilOrEmpty(pattern)) return false;

      const keys = await this.redisClient.keys(pattern);
      if (isNilOrEmpty(keys)) return false;

      await this.redisClient.del(keys);
      return true;
    } catch (ex) {
      this.logger.error({ error: ex, pattern }, "Redis deleteByPrefix failed");
      throw new RedisException(ex);
    }
  }

  public async keys(pattern: string): Promise<string[]> {
    try {
      if (isNilOrEmpty(pattern)) return [];

      return await this.redisClient.keys(pattern);
    } catch (ex) {
      this.logger.error({ error: ex, pattern }, "Redis KEYS failed");
      throw new RedisException(ex);
    }
  }

  public async getKeyExpirationTimeAsync(key: string): Promise<number> {
    try {
      return await this.redisClient.ttl(key);
    } catch (ex) {
      this.logger.error({ error: ex, key }, "Redis TTL failed");
      throw new RedisException(ex);
    }
  }

  // ------------------------------------------------------
  // HASH Operations
  // ------------------------------------------------------
  public async hsetAsync(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.redisClient.hSet(key, field, value);
    } catch (ex) {
      this.logger.error({ error: ex, key, field, value }, "Redis HSET failed");
      throw new RedisException(ex);
    }
  }
  /**
   * Add a member to a sorted set with a score
   * @param key - The sorted set key
   * @param score - The score for the member
   * @param member - The member to add (typically JSON string)
   * @returns The number of elements added (0 if already exists, 1 if new)
   */
  public async zAdd(key: string, score: number, member: string): Promise<number> {
    try {
      const result = await this.redisClient.zAdd(key, { score, value: member });
      this.logger.debug(`ZADD: Added member to ${key} with score ${score}`);
      return result;
    } catch (ex) {
      this.logger.error(`Error in ZADD for key ${key}:`, ex);
      throw new RedisException(ex);
    }
  }

  public async hgetAsync(key: string, field: string): Promise<string> {
    try {
      return (await this.redisClient.hGet(key, field)) as any;
    } catch (ex) {
      this.logger.error({ error: ex, key, field }, "Redis HGET failed");
      throw new RedisException(ex);
    }
  }
  /**
   * Remove a member from a sorted set
   * @param key - The sorted set key
   * @param member - The member to remove
   * @returns The number of members removed (0 or 1)
   */
  public async zRem(key: string, member: string): Promise<number> {
    try {
      const result = await this.redisClient.zRem(key, member);
      this.logger.debug(`ZREM: Removed member from ${key}`);
      return result;
    } catch (ex) {
      this.logger.error(`Error in ZREM for key ${key}:`, ex);
      throw new RedisException(ex);
    }
  }

  /**
   * Get members from a sorted set within a score range
   * @param key - The sorted set key
   * @param min - Minimum score (inclusive), use '-inf' for negative infinity
   * @param max - Maximum score (inclusive), use '+inf' for positive infinity
   * @returns Array of members within the score range
   */
  public async zRangeByScore(key: string, min: string | number, max: string | number): Promise<string[]> {
    try {
      const result = await this.redisClient.zRangeByScore(key, min, max);
      this.logger.debug(`ZRANGEBYSCORE: Retrieved ${result.length} members from ${key}`);
      return result;
    } catch (ex) {
      this.logger.error(`Error in ZRANGEBYSCORE for key ${key}:`, ex);
      throw new RedisException(ex);
    }
  }

  /**
   * Set a timeout on a key (in seconds)
   * @param key - The key to expire
   * @param seconds - Expiration time in seconds
   * @returns true if timeout was set, false if key doesn't exist
   */
  public async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redisClient.expire(key, seconds);
      this.logger.debug(`EXPIRE: Set ${seconds}s TTL on ${key}`);
      return !!result;
    } catch (ex) {
      this.logger.error(`Error in EXPIRE for key ${key}:`, ex);
      throw new RedisException(ex);
    }
  }

  /**
   * Get the number of members in a sorted set
   * @param key - The sorted set key
   * @returns The cardinality (number of elements) of the sorted set
   */
  public async zCard(key: string): Promise<number> {
    try {
      const result = await this.redisClient.zCard(key);
      this.logger.debug(`ZCARD: ${key} has ${result} members`);
      return result;
    } catch (ex) {
      this.logger.error(`Error in ZCARD for key ${key}:`, ex);
      throw new RedisException(ex);
    }
  }

  /**
   * Remove all members in a sorted set within the given score range
   * @param key - The sorted set key
   * @param min - Minimum score (inclusive)
   * @param max - Maximum score (inclusive)
   * @returns The number of members removed
   */
  public async zRemRangeByScore(key: string, min: string | number, max: string | number): Promise<number> {
    try {
      const result = await this.redisClient.zRemRangeByScore(key, min, max);
      this.logger.debug(`ZREMRANGEBYSCORE: Removed ${result} members from ${key}`);
      return result;
    } catch (ex) {
      this.logger.error(`Error in ZREMRANGEBYSCORE for key ${key}:`, ex);
      throw new RedisException(ex);
    }
  }

  // --------------------------------------------------------------------
  // Internal Connection Logic
  // --------------------------------------------------------------------

  /**
   * Creates a new Redis client.
   */
  private createClient(): void {
    //TODO: @devs Need to update this logic when AWS secret is implemented, currently we are not able to remove redis password key or set value as 0 in github secret
    const authPart =
      !isNilOrEmpty(this.options.username) && !isNilOrEmpty(this.options.password) && this.options.password !== "null_value"
        ? `${this.options.username}:${this.options.password}@`
        : "";
    this.redisClient = createClient({
      name: this.options.connectionName,
      url: `${this.options.transport}://${authPart}${this.options.host}:${this.options.port}`,
      socket: {
        connectTimeout: this.options.reconnectionDelayInMilliseconds,
        // Disable reconnect strategy, we will handle it manually. It seems to be buggy.
        reconnectStrategy: false,
      },
    });
  }

  private addListeners(): void {
    this.redisClient.on("error", (error) => {
      this.logger.error({ error }, "Redis client error");
      this.connected = false;
      this.ready = false;
      this.startReconnectionStrategy();
    });

    this.redisClient.on("ready", () => {
      this.logger.info("Redis client ready");
      this.ready = true;
    });

    this.redisClient.on("connect", () => {
      this.logger.info("Redis client connected");
      this.connected = true;
    });

    this.redisClient.on("disconnect", () => {
      this.logger.warn("Redis client disconnected");
      this.connected = false;
    });
  }

  private async startConnectionAsync(): Promise<void> {
    try {
      await this.redisClient.connect();
    } catch (ex) {
      this.logger.warn({ error: ex }, "Redis initial connect failed");
      this.startReconnectionStrategy();
    }
  }

  private startReconnectionStrategy(): void {
    if (this.reconnecting) {
      this.logger.debug("Redis reconnection already in progress");
      return;
    }

    this.reconnecting = true;

    if (this.connected) {
      void this.redisClient.disconnect();
    }

    setTimeout(() => {
      this.logger.info("Attempting Redis reconnection");

      this.redisClient
        .connect()
        .then(() => {
          this.reconnecting = false;
          this.reconnectionAttempts = 0;
          this.logger.info("Redis reconnected successfully");
        })
        .catch((ex) => {
          this.reconnectionAttempts++;
          this.reconnecting = false;

          this.logger.error({ error: ex, attempts: this.reconnectionAttempts }, "Redis reconnection attempt failed");

          if (this.reconnectionAttempts > this.options.maxReconnectionAttempts) {
            this.logger.error("Max Redis reconnection attempts reached");
            return;
          }

          this.startReconnectionStrategy();
        });
    }, this.options.reconnectionDelayInMilliseconds);
  }
}
