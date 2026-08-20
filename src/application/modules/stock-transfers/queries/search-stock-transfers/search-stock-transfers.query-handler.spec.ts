jest.mock('@automapper/classes', () => ({
  AutoMap: () => () => undefined,
}));

jest.mock('../../../../../common', () => ({
  QueryHandlerStrict: () => () => undefined,
  QueryBase: class QueryBase {},
}));

jest.mock('../../../../constants', () => ({
  STOCK_TRANSFER_REPO: 'STOCK_TRANSFER_REPO',
}));

jest.mock('../list-stock-transfers/list-stock-transfers.query', () => ({
  ListStockTransfersQuery: class ListStockTransfersQuery {},
}));

jest.mock('./search-stock-transfers.query', () => ({
  SearchStockTransfersQuery: class SearchStockTransfersQuery {},
}));

import { SearchStockTransfersQueryHandler } from './search-stock-transfers.query-handler';
import { SearchStockTransfersQuery } from './search-stock-transfers.query';

describe('SearchStockTransfersQueryHandler', () => {
  const repo = {
    pagedAsync: jest.fn(),
  };
  const filterNormalizer = {
    pageableNormalize: jest.fn((filter) => filter),
  };
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const handler = new SearchStockTransfersQueryHandler(
    repo as never,
    filterNormalizer as never,
    logger as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to repo.pagedAsync with normalized filter', async () => {
    const query = Object.assign(new SearchStockTransfersQuery(), {
      organizationId: 'org-1',
      $page: 1,
      $perPage: 15,
      accessibleLocationIds: ['loc-a'],
    });
    const page = { items: [], page: 1, perPage: 15, totalCount: 0, totalPages: 0 };
    repo.pagedAsync.mockResolvedValue(page);

    await expect(handler.execute(query)).resolves.toEqual(page);
    expect(filterNormalizer.pageableNormalize).toHaveBeenCalledWith(query);
    expect(repo.pagedAsync).toHaveBeenCalledWith(query);
  });
});
