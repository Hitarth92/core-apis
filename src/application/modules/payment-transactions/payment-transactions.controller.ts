import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles, AuthenticatedUser, CurrentUser, requireOrganizationId, assertOrgOwnership } from '../../../common';
import { IPageable } from '../../../common';
import { ERole } from '../../../infrastructure';
import { CreatePaymentTransactionCommand, DeletePaymentTransactionCommand, UpdatePaymentTransactionCommand } from './commands';
import { PaymentTransaction } from './domain';
import { CreatePaymentTransactionRequest, SearchPaymentTransactionsRequest, ListPaymentTransactionsRequest, PaymentTransactionResponse, PaymentTransactionsPagedResponse, UpdatePaymentTransactionRequest } from './models';
import { GetPaymentTransactionQuery, ListPaymentTransactionsQuery, SearchPaymentTransactionsQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Payment Transactions')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'payment-transactions', version: '1' })
export class PaymentTransactionsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(PaymentTransactionsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search payment transactions (paginated)' })
  @ApiOkResponse({ type: PaymentTransactionsPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async search(
    @Query() filter?: SearchPaymentTransactionsRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PaymentTransactionsPagedResponse> {
    const query = filter
      ? this.mapper.map(filter, SearchPaymentTransactionsRequest, SearchPaymentTransactionsQuery)
      : new SearchPaymentTransactionsQuery();
    query.orgId = requireOrganizationId(user);
    const result = await this.mediator.execute<SearchPaymentTransactionsQuery, IPageable<PaymentTransaction>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, PaymentTransaction, PaymentTransactionResponse),
    };
  }

  @ApiOperation({ summary: 'List all payment transactions' })
  @ApiOkResponse({ type: [PaymentTransactionResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(
    @Query() filter?: ListPaymentTransactionsRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PaymentTransactionResponse[]> {
    const query = filter
      ? this.mapper.map(filter, ListPaymentTransactionsRequest, ListPaymentTransactionsQuery)
      : new ListPaymentTransactionsQuery();
    query.orgId = requireOrganizationId(user);
    const result = await this.mediator.execute<ListPaymentTransactionsQuery, PaymentTransaction[]>(query);
    return this.mapper.mapArray(result, PaymentTransaction, PaymentTransactionResponse);
  }

  @ApiOperation({ summary: 'Get payment transaction by ID' })
  @ApiOkResponse({ type: PaymentTransactionResponse })
  @ApiParam({ name: 'id', description: 'Payment Transaction UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<PaymentTransactionResponse> {
    const query = new GetPaymentTransactionQuery();
    query.id = id;
    const result = await this.mediator.execute<GetPaymentTransactionQuery, PaymentTransaction>(query);
    assertOrgOwnership(user, result.orgId, 'payment-transaction');
    return this.mapper.map(result, PaymentTransaction, PaymentTransactionResponse);
  }

  @ApiOperation({ summary: 'Create a new payment transaction' })
  @ApiCreatedResponse({ type: PaymentTransactionResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @Body() body: CreatePaymentTransactionRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PaymentTransactionResponse> {
    const command = this.mapper.map(body, CreatePaymentTransactionRequest, CreatePaymentTransactionCommand);
    command.orgId = requireOrganizationId(user);
    const result  = await this.mediator.execute<CreatePaymentTransactionCommand, PaymentTransaction>(command);
    return this.mapper.map(result, PaymentTransaction, PaymentTransactionResponse);
  }

  @ApiOperation({ summary: 'Update a payment transaction' })
  @ApiOkResponse({ type: PaymentTransactionResponse })
  @ApiParam({ name: 'id', description: 'Payment Transaction UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdatePaymentTransactionRequest, @CurrentUser() user?: AuthenticatedUser): Promise<PaymentTransactionResponse> {
    const existing = await this.mediator.execute<GetPaymentTransactionQuery, PaymentTransaction>(Object.assign(new GetPaymentTransactionQuery(), { id }));
    assertOrgOwnership(user, existing.orgId, 'payment-transaction');
    const command = this.mapper.map(body, UpdatePaymentTransactionRequest, UpdatePaymentTransactionCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdatePaymentTransactionCommand, PaymentTransaction>(command);
    return this.mapper.map(result, PaymentTransaction, PaymentTransactionResponse);
  }

  @ApiOperation({ summary: 'Delete a payment transaction' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Payment Transaction UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
    const command = new DeletePaymentTransactionCommand();
    command.id    = id;
    return this.mediator.execute<DeletePaymentTransactionCommand, boolean>(command);
  }
}
