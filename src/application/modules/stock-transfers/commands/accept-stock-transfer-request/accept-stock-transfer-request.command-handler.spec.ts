jest.mock('@automapper/classes', () => ({
  AutoMap: () => () => undefined,
}));

jest.mock('../../../../../common', () => ({
  CommandHandlerStrict: () => () => undefined,
  CommandBase: class CommandBase {},
}));

jest.mock('../../../../../common/push-notification', () => ({
  PUSH_NOTIFICATION_SERVICE: 'PUSH_NOTIFICATION_SERVICE',
}));

jest.mock('../../../../shared/services/stock-orchestration.service', () => ({
  StockOrchestrationService: class StockOrchestrationService {},
}));

jest.mock('../../../../constants', () => ({
  STOCK_TRANSFER_REQUEST_REPO: 'STOCK_TRANSFER_REQUEST_REPO',
  STOCK_TRANSFER_REPO: 'STOCK_TRANSFER_REPO',
  INVENTORY_REPO: 'INVENTORY_REPO',
}));

jest.mock('../../../inventory', () => ({
  IInventoryRepo: {},
}));

import { BadRequestException } from '@nestjs/common';
import { EStockTransferRequestStatus } from '../../../../shared/enums/e-stock-transfer-request-status';
import { EStockTransferStatus } from '../../../../shared/enums/e-stock-transfer-status';
import { AcceptStockTransferRequestCommand } from './accept-stock-transfer-request.command';
import { AcceptStockTransferRequestCommandHandler } from './accept-stock-transfer-request.command-handler';

describe('AcceptStockTransferRequestCommandHandler', () => {
  const logger = { info: jest.fn(), warn: jest.fn() };
  let repo: {
    getAsync: jest.Mock;
    updateAsync: jest.Mock;
    findUsersForLocationAsync: jest.Mock;
  };
  let transferRepo: { createAsync: jest.Mock };
  let inventoryRepo: { findByOrgLocationProductAsync: jest.Mock };
  let orchestrator: { removeStock: jest.Mock };
  let pushNotification: { sendBatchAsync: jest.Mock };
  let handler: AcceptStockTransferRequestCommandHandler;

  const openRequest = {
    id: 'req-1',
    organizationId: 'org-1',
    requestingLocationId: 'loc-requesting',
    productId: 'prod-1',
    quantityRequested: 4,
    status: EStockTransferRequestStatus.Open,
  };

  beforeEach(() => {
    repo = {
      getAsync: jest.fn(async () => ({ ...openRequest })),
      updateAsync: jest.fn(async (request) => request),
      findUsersForLocationAsync: jest.fn(async () => ['u-requesting']),
    };
    transferRepo = {
      createAsync: jest.fn(async () => ({ id: 'xfer-1' })),
    };
    inventoryRepo = {
      findByOrgLocationProductAsync: jest.fn(async () => ({
        id: 'inv-1',
        quantityOnHand: 10,
        quantityReserved: 1,
      })),
    };
    orchestrator = { removeStock: jest.fn(async () => undefined) };
    pushNotification = { sendBatchAsync: jest.fn(async () => undefined) };
    handler = new AcceptStockTransferRequestCommandHandler(
      repo as never,
      transferRepo as never,
      inventoryRepo as never,
      orchestrator as never,
      pushNotification as never,
      logger as never,
    );
  });

  const command = (over: Partial<AcceptStockTransferRequestCommand> = {}) =>
    Object.assign(new AcceptStockTransferRequestCommand(), {
      requestId: 'req-1',
      organizationId: 'org-1',
      acceptingLocationId: 'loc-accepting',
      acceptingUserId: 'u-accepting',
      ...over,
    });

  it('rejects org mismatch as not found', async () => {
    await expect(handler.execute(command({ organizationId: 'org-other' }))).rejects.toThrow(
      /not found/,
    );
  });

  it('rejects non-OPEN requests', async () => {
    repo.getAsync.mockResolvedValue({ ...openRequest, status: EStockTransferRequestStatus.Accepted });
    await expect(handler.execute(command())).rejects.toThrow(/not OPEN/);
  });

  it("rejects accepting the store's own request", async () => {
    await expect(
      handler.execute(command({ acceptingLocationId: 'loc-requesting' })),
    ).rejects.toThrow(/cannot accept its own request/);
  });

  it('rejects when inventory is missing', async () => {
    inventoryRepo.findByOrgLocationProductAsync.mockResolvedValue(null);
    await expect(handler.execute(command())).rejects.toThrow(/No inventory record/);
  });

  it('rejects insufficient available stock', async () => {
    inventoryRepo.findByOrgLocationProductAsync.mockResolvedValue({
      id: 'inv-1',
      quantityOnHand: 3,
      quantityReserved: 0,
    });
    await expect(handler.execute(command())).rejects.toThrow(BadRequestException);
  });

  it('deducts stock, creates pending transfer, marks request ACCEPTED', async () => {
    const updated = await handler.execute(command());

    expect(orchestrator.removeStock).toHaveBeenCalledWith(
      expect.objectContaining({
        inventoryId: 'inv-1',
        locationId: 'loc-accepting',
        quantity: 4,
        referenceId: 'req-1',
      }),
    );
    expect(transferRepo.createAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        fromLocationId: 'loc-accepting',
        toLocationId: 'loc-requesting',
        status: EStockTransferStatus.Pending,
      }),
    );
    expect(updated.status).toBe(EStockTransferRequestStatus.Accepted);
    expect(updated.fulfillmentTransferId).toBe('xfer-1');
    expect(updated.acceptedByLocationId).toBe('loc-accepting');
    expect(pushNotification.sendBatchAsync).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 'u-requesting', type: 'STOCK_REQUEST_ACCEPTED' }),
    ]);
  });
});
