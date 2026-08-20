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

import { EStockTransferRequestStatus } from '../../../../shared/enums/e-stock-transfer-request-status';
import { RaiseStockTransferRequestCommand } from './raise-stock-transfer-request.command';
import { RaiseStockTransferRequestCommandHandler } from './raise-stock-transfer-request.command-handler';

describe('RaiseStockTransferRequestCommandHandler', () => {
  const logger = { info: jest.fn(), warn: jest.fn() };
  let repo: {
    createAsync: jest.Mock;
    findAllUserIdsInOrgAsync: jest.Mock;
    findUsersForLocationAsync: jest.Mock;
  };
  let pushNotification: { sendBatchAsync: jest.Mock };
  let handler: RaiseStockTransferRequestCommandHandler;

  beforeEach(() => {
    repo = {
      createAsync: jest.fn(async (request) => ({ ...request, id: 'req-1' })),
      findAllUserIdsInOrgAsync: jest.fn(async () => ['u-a', 'u-b', 'u-c']),
      findUsersForLocationAsync: jest.fn(async () => ['u-a']),
    };
    pushNotification = { sendBatchAsync: jest.fn(async () => undefined) };
    handler = new RaiseStockTransferRequestCommandHandler(
      repo as never,
      pushNotification as never,
      logger as never,
    );
  });

  it('persists an OPEN request and notifies other org users', async () => {
    const command = Object.assign(new RaiseStockTransferRequestCommand(), {
      organizationId: 'org-1',
      requestingLocationId: 'loc-1',
      requestingUserId: 'u-a',
      productId: 'prod-1',
      quantityRequested: 5,
    });

    const saved = await handler.execute(command);

    expect(repo.createAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        requestingLocationId: 'loc-1',
        productId: 'prod-1',
        quantityRequested: 5,
        status: EStockTransferRequestStatus.Open,
      }),
    );
    expect(saved.id).toBe('req-1');
    expect(pushNotification.sendBatchAsync).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 'u-b', type: 'STOCK_REQUEST_RAISED' }),
      expect.objectContaining({ userId: 'u-c', type: 'STOCK_REQUEST_RAISED' }),
    ]);
  });

  it('still returns the saved request when notification fails', async () => {
    pushNotification.sendBatchAsync.mockRejectedValue(new Error('push down'));
    const command = Object.assign(new RaiseStockTransferRequestCommand(), {
      organizationId: 'org-1',
      requestingLocationId: 'loc-1',
      productId: 'prod-1',
      quantityRequested: 1,
    });

    const saved = await handler.execute(command);
    expect(saved.id).toBe('req-1');
    expect(logger.warn).toHaveBeenCalled();
  });
});
