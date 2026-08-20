import { Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict, IBaseRepo } from '../../../../../common';
import { PRODUCT_SUPPLIER_REPO } from '../../../../constants';
import { ProductSupplier } from '../../domain';
import { LinkProductSupplierCommand } from './link-product-supplier.command';

@CommandHandlerStrict(LinkProductSupplierCommand)
export class LinkProductSupplierCommandHandler implements ICommandHandler<LinkProductSupplierCommand, ProductSupplier> {
  constructor(
    @Inject(PRODUCT_SUPPLIER_REPO) private readonly repo: IBaseRepo<ProductSupplier, string>,
    @InjectMapper() private readonly mapper: Mapper,
    @InjectPinoLogger(LinkProductSupplierCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: LinkProductSupplierCommand): Promise<ProductSupplier> {
    this.logger.info(`Linking supplier ${command.supplierId} to product ${command.productId}`);

    if (command.isDefault) {
      const existing = await this.repo.allAsync({ productId: command.productId });
      for (const link of existing.filter((ln) => ln.isDefault)) {
        link.isDefault = false;
        await this.repo.updateAsync(link);
      }
    }

    const link = this.mapper.map(command, LinkProductSupplierCommand, ProductSupplier);
    link.isDefault = command.isDefault ?? false;
    return this.repo.createAsync(link);
  }
}
