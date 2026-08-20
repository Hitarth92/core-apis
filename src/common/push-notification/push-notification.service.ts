import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CentrifugalService } from '../centrifugal';
import { NOTIFICATION_REPO } from '../../application/constants';
import { INotificationRepo } from '../../application/modules/notifications';
import { IPushNotificationService } from './i-push-notification.service';
import { PushNotificationPayload } from './domain';
import { PushNotificationException } from './exceptions';

const USER_CHANNEL_PREFIX = 'user_';
const ORG_CHANNEL_PREFIX = 'org_';

@Injectable()
export class PushNotificationService implements IPushNotificationService {
  constructor(
    private readonly centrifugal: CentrifugalService,
    @Inject(NOTIFICATION_REPO) private readonly notificationRepo: INotificationRepo,
    @InjectPinoLogger(PushNotificationService.name) private readonly logger: PinoLogger,
  ) {}

  public async sendAsync(payload: PushNotificationPayload): Promise<void> {
    this.logger.info({ userId: payload.userId, type: payload.type }, 'Sending push notification');
    try {
      await this.persistAsync(payload);
      const channel = `${USER_CHANNEL_PREFIX}${payload.userId}`;
      await this.centrifugal.publish(channel, {
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      });
      this.logger.info({ userId: payload.userId }, 'Push notification sent');
    } catch (err) {
      const error = err as Error;
      this.logger.error({ error: error.message, userId: payload.userId }, 'Push notification failed');
      throw new PushNotificationException(error.message);
    }
  }

  public async sendBatchAsync(payloads: PushNotificationPayload[]): Promise<void> {
    this.logger.info({ count: payloads.length }, 'Sending batch push notifications');
    const results = await Promise.allSettled(payloads.map((pp) => this.sendAsync(pp)));
    const failCount = results.filter((rr) => rr.status === 'rejected').length;
    if (failCount > 0) {
      this.logger.warn({ failCount, total: payloads.length }, 'Some push notifications failed');
    }
  }

  public async broadcastToOrgAsync(
    organizationId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    this.logger.info({ organizationId, type }, 'Broadcasting org push notification');
    try {
      const channel = `${ORG_CHANNEL_PREFIX}${organizationId}`;
      await this.centrifugal.publish(channel, { type, title, body, data: data ?? {} });
      this.logger.info({ organizationId }, 'Org broadcast sent');
    } catch (err) {
      const error = err as Error;
      this.logger.error({ error: error.message, organizationId }, 'Org broadcast failed');
      throw new PushNotificationException(error.message);
    }
  }

  private async persistAsync(payload: PushNotificationPayload): Promise<void> {
    const notification = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
    };
    await this.notificationRepo.createAsync(notification as never);
  }
}
