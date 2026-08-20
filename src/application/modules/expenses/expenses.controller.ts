import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ParseEnumPipe } from '@nestjs/common';
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles, AuthenticatedUser, CurrentUser, requireOrganizationId, assertOrgOwnership } from '../../../common';
import { ERole } from '../../../infrastructure';
import { CreateExpenseCommand, UpdateExpenseStatusCommand } from './commands';
import { Expense } from './domain';
import { CreateExpenseRequest, ExpenseResponse, UpdateExpenseStatusRequest } from './models';
import { GetExpenseQuery, ListExpensesQuery } from './queries';
import { EExpenseStatus } from '../../../infrastructure/e-expense-status';

@ApiBearerAuth()
@ApiTags('Expenses')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'expenses', version: '1' })
export class ExpensesController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(ExpensesController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'List all expenses' })
  @ApiOkResponse({ type: [ExpenseResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(
    @Query('status', new ParseEnumPipe(EExpenseStatus, { optional: true })) status?: EExpenseStatus,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ExpenseResponse[]> {
    const query = new ListExpensesQuery();
    query.status = status;
    query.organizationId = requireOrganizationId(user);
    return this.mediator.execute<ListExpensesQuery, ExpenseResponse[]>(query);
  }

  @ApiOperation({ summary: 'Update expense status (approve / reject)' })
  @ApiOkResponse({ type: ExpenseResponse })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Patch(':id/status')
  public async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateExpenseStatusRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExpenseResponse> {
    const existingQuery = new GetExpenseQuery();
    existingQuery.id = id;
    const existing = await this.mediator.execute<GetExpenseQuery, Expense>(existingQuery);
    assertOrgOwnership(user, existing.organizationId, 'Expense');
    const command = new UpdateExpenseStatusCommand();
    command.id = id;
    command.status = body.status;
    const result = await this.mediator.execute<UpdateExpenseStatusCommand, Expense>(command);
    return this.mapper.map(result, Expense, ExpenseResponse);
  }

  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiOkResponse({ type: ExpenseResponse })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<ExpenseResponse> {
    const query = new GetExpenseQuery();
    query.id = id;
    const result = await this.mediator.execute<GetExpenseQuery, Expense>(query);
    assertOrgOwnership(user, result.organizationId, 'Expense');
    return this.mapper.map(result, Expense, ExpenseResponse);
  }

  @ApiOperation({ summary: 'Create a new expense' })
  @ApiCreatedResponse({ type: ExpenseResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @Body() body: CreateExpenseRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ExpenseResponse> {
    const command = this.mapper.map(body, CreateExpenseRequest, CreateExpenseCommand);
    command.organizationId = requireOrganizationId(user);
    const result  = await this.mediator.execute<CreateExpenseCommand, Expense>(command);
    return this.mapper.map(result, Expense, ExpenseResponse);
  }
}
