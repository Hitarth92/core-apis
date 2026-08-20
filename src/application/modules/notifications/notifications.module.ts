import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NotificationsController } from './notifications.controller';
import { NotificationCommandHandlers } from './commands';
import { NotificationQueryHandlers } from './queries';
import { NotificationProfile } from './mapper/notification.profile';
import { NotificationFeatureOptions } from './options';
import { NotificationFilterNormalizer } from './helpers';

@Module({
  imports: [CqrsModule],
  controllers: [NotificationsController],
  providers: [
    ...NotificationCommandHandlers,
    ...NotificationQueryHandlers,
    NotificationProfile,
    NotificationFeatureOptions,
    NotificationFilterNormalizer,
  ],
})
export class NotificationsModule {}
