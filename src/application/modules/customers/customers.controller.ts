import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, RolesGuard, Roles, requireDbUserId, requireOrganizationId, assertOrgOwnership } from '../../../common';
import { CreateCreditTransactionCommand, CreateCustomerCommand, DeleteCustomerCommand, UpdateCustomerCommand } from './commands';
import { Customer } from './domain';
import {
  CreateCreditTransactionRequest,
  CreateCustomerRequest,
  CustomerResponse,
  CustomerCreditTransactionResponse,
  SearchCustomersRequest,
  UpdateCustomerRequest,
} from './models';
import { GetCustomerQuery, ListCustomerBillsQuery, ListCustomerCreditTransactionsQuery, SearchCustomersQuery } from './queries';
import { ERole } from '../../../infrastructure';
import { Bill } from '../bills/domain';
import { BillResponse } from '../bills/models';
import { CustomerCreditTransaction } from '../credit-approvals/domain';

class CustomersPagedResponse {
  public items: CustomerResponse[];
  public page: number;
  public perPage: number;
  public totalCount: number;
  public totalPages: number;
}

class BillsPagedResponse {
  public items: BillResponse[];
  public page: number;
  public perPage: number;
  public totalCount: number;
  public totalPages: number;
}

class CreditTransactionsPagedResponse {
  public items: CustomerCreditTransactionResponse[];
  public page: number;
  public perPage: number;
  public totalCount: number;
  public totalPages: number;
}

const ADMIN_ROLES = [ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin];

@ApiBearerAuth()
@ApiTags('Customers')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(CustomersController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search customers (paginated)' })
  @ApiOkResponse({ type: CustomersPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async search(@Query() filter?: SearchCustomersRequest): Promise<CustomersPagedResponse> {
    const query  = this.mapper.map(filter, SearchCustomersRequest, SearchCustomersQuery);
    const result = await this.mediator.execute<SearchCustomersQuery, IPageable<Customer>>(query);
    return { ...result, items: this.mapper.mapArray(result.items, Customer, CustomerResponse) };
  }

  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiOkResponse({ type: CustomerResponse })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<CustomerResponse> {
    const query = new GetCustomerQuery();
    query.id = id;
    const result = await this.mediator.execute<GetCustomerQuery, Customer>(query);
    assertOrgOwnership(user, result.organizationId, 'Customer');
    return this.mapper.map(result, Customer, CustomerResponse);
  }

  @ApiOperation({ summary: 'Create a new customer' })
  @ApiCreatedResponse({ type: CustomerResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @Body() body: CreateCustomerRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CustomerResponse> {
    const command = this.mapper.map(body, CreateCustomerRequest, CreateCustomerCommand);
    command.organizationId = requireOrganizationId(user);
    const result  = await this.mediator.execute<CreateCustomerCommand, Customer>(command);
    return this.mapper.map(result, Customer, CustomerResponse);
  }

  @ApiOperation({ summary: 'Update a customer' })
  @ApiOkResponse({ type: CustomerResponse })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateCustomerRequest, @CurrentUser() user: AuthenticatedUser): Promise<CustomerResponse> {
    const fetchQuery = new GetCustomerQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetCustomerQuery, Customer>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Customer');
    const command = this.mapper.map(body, UpdateCustomerRequest, UpdateCustomerCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdateCustomerCommand, Customer>(command);
    return this.mapper.map(result, Customer, CustomerResponse);
  }

  @ApiOperation({ summary: 'Delete a customer (soft delete)' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
    const command = new DeleteCustomerCommand();
    command.id    = id;
    return this.mediator.execute<DeleteCustomerCommand, boolean>(command);
  }

  @ApiOperation({ summary: 'List bills for a customer' })
  @ApiOkResponse({ type: BillsPagedResponse })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiQuery({ name: '$page', required: false, type: Number })
  @ApiQuery({ name: '$perPage', required: false, type: Number })
  @HttpCode(HttpStatus.OK)
  @Get(':id/bills')
  public async listBills(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('$page') page?: number,
    @Query('$perPage') perPage?: number,
  ): Promise<BillsPagedResponse> {
    const customer = await this.mediator.execute<GetCustomerQuery, Customer>(Object.assign(new GetCustomerQuery(), { id }));
    assertOrgOwnership(user, customer.organizationId, 'Customer');
    const isAdmin = user.roles?.some((r) => [ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin].includes(r as ERole));
    const query = new ListCustomerBillsQuery();
    query.customerId     = id;
    query.organizationId = customer.organizationId;
    query.excludeBlack   = !isAdmin;
    query.$page          = page ? Number(page) : 1;
    query.$perPage       = perPage ? Number(perPage) : 10;
    const result = await this.mediator.execute<ListCustomerBillsQuery, IPageable<Bill>>(query);
    return { ...result, items: this.mapper.mapArray(result.items, Bill, BillResponse) };
  }

  @ApiOperation({ summary: 'List credit transactions for a customer' })
  @ApiOkResponse({ type: CreditTransactionsPagedResponse })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiQuery({ name: '$page', required: false, type: Number })
  @ApiQuery({ name: '$perPage', required: false, type: Number })
  @HttpCode(HttpStatus.OK)
  @Get(':id/credit-transactions')
  public async listCreditTransactions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('$page') page?: number,
    @Query('$perPage') perPage?: number,
  ): Promise<CreditTransactionsPagedResponse> {
    const customer = await this.mediator.execute<GetCustomerQuery, Customer>(Object.assign(new GetCustomerQuery(), { id }));
    assertOrgOwnership(user, customer.organizationId, 'Customer');
    const query = new ListCustomerCreditTransactionsQuery();
    query.customerId     = id;
    query.organizationId = customer.organizationId;
    query.$page          = page ? Number(page) : 1;
    query.$perPage       = perPage ? Number(perPage) : 20;
    const result = await this.mediator.execute<ListCustomerCreditTransactionsQuery, IPageable<CustomerCreditTransaction>>(query);
    return { ...result, items: this.mapper.mapArray(result.items, CustomerCreditTransaction, CustomerCreditTransactionResponse) };
  }

  @ApiOperation({ summary: 'Record a payment or manual credit adjustment for a customer' })
  @ApiOkResponse({ type: CustomerResponse })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @HttpCode(HttpStatus.OK)
  @Post(':id/credit-transactions')
  public async createCreditTransaction(
    @Param('id') id: string,
    @Body() body: CreateCreditTransactionRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerResponse> {
    if (body.type === 'adjustment') {
      const isAdmin = user.roles?.some((r) => ADMIN_ROLES.includes(r as ERole));
      if (!isAdmin) throw new ForbiddenException('Only managers can create credit adjustments');
    }
    const customer = await this.mediator.execute<GetCustomerQuery, Customer>(Object.assign(new GetCustomerQuery(), { id }));
    assertOrgOwnership(user, customer.organizationId, 'Customer');
    const command = new CreateCreditTransactionCommand();
    command.customerId     = id;
    command.organizationId = customer.organizationId;
    command.type           = body.type;
    command.amount         = body.amount;
    command.paymentMethod  = body.paymentMethod;
    command.note           = body.note;
    command.performedById  = requireDbUserId(user);
    const updated = await this.mediator.execute<CreateCreditTransactionCommand, Customer>(command);
    return this.mapper.map(updated, Customer, CustomerResponse);
  }
}
