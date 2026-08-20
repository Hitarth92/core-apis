import { createMap, Mapper } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InvoiceEntity } from '../../../../infrastructure/persistence/entities/invoice.entity';
import { Invoice } from '../domain';
import { CreateInvoiceRequest, InvoiceResponse } from '../models';
import { CreateInvoiceCommand } from '../commands';

@Injectable()
export class InvoiceProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) { super(mapper); }

  public get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, InvoiceEntity, Invoice);
      createMap(mapper, Invoice, InvoiceEntity);
      createMap(mapper, CreateInvoiceRequest, CreateInvoiceCommand);
      createMap(mapper, Invoice, InvoiceResponse);
    };
  }
}
