import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ItemReturnsController } from './item-returns.controller';
import { ItemReturnCommandHandlers } from './commands';
import { ItemReturnQueryHandlers } from './queries';
import { ItemReturnProfile } from './mapper/item-return.profile';
import { ItemReturnFeatureOptions } from './options';
import { ItemReturnFilterNormalizer } from './helpers';

@Module({
  imports: [CqrsModule],
  controllers: [ItemReturnsController],
  providers: [
    ...ItemReturnCommandHandlers,
    ...ItemReturnQueryHandlers,
    ItemReturnProfile,
    ItemReturnFeatureOptions,
    ItemReturnFilterNormalizer,
  ],
})
export class ItemReturnsModule {}
