import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, Roles, RolesGuard, requireOrganizationId } from '../../../common';
import { ERole } from '../../../infrastructure/persistence/entities/role.entity';
import {
  CreateQuickChargeCommand,
  DeleteQuickChargeCommand,
  UpdateCustomerTypeRuleCommand,
  UpdateQuickChargeCommand,
} from './commands';
import { CustomerTypeRule, QuickCharge } from './domain';
import {
  CreateQuickChargeRequest,
  CustomerTypeRuleResponse,
  QuickChargeResponse,
  UpdateCustomerTypeRuleRequest,
  UpdateQuickChargeRequest,
} from './models';
import { ListCustomerTypeRulesQuery, ListQuickChargesQuery } from './queries';

const ADMIN_ROLES = [ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin] as const;
const READ_ROLES = [...ADMIN_ROLES, ERole.StoreManager, ERole.StoreStaff] as const;

@ApiBearerAuth()
@ApiTags('Billing Settings')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Controller({ path: 'billing-settings', version: '1' })
export class BillingSettingsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(BillingSettingsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'List quick charges for the current organization' })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  @ApiOkResponse({ type: [QuickChargeResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('quick-charges')
  @Roles(...READ_ROLES)
  public async listQuickCharges(
    @Query('enabled') enabled?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<QuickChargeResponse[]> {
    const query = new ListQuickChargesQuery();
    query.organizationId = requireOrganizationId(user);
    if (enabled === 'true') query.enabled = true;
    if (enabled === 'false') query.enabled = false;
    return this.mediator.execute<ListQuickChargesQuery, QuickChargeResponse[]>(query);
  }

  @ApiOperation({ summary: 'Create a quick charge' })
  @ApiCreatedResponse({ type: QuickChargeResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post('quick-charges')
  @Roles(...ADMIN_ROLES)
  public async createQuickCharge(
    @Body() body: CreateQuickChargeRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<QuickChargeResponse> {
    const command = this.mapper.map(body, CreateQuickChargeRequest, CreateQuickChargeCommand);
    command.organizationId = requireOrganizationId(user);
    const result = await this.mediator.execute<CreateQuickChargeCommand, QuickCharge>(command);
    return this.mapper.map(result, QuickCharge, QuickChargeResponse);
  }

  @ApiOperation({ summary: 'Update a quick charge' })
  @ApiOkResponse({ type: QuickChargeResponse })
  @ApiParam({ name: 'id', description: 'Quick charge UUID' })
  @HttpCode(HttpStatus.OK)
  @Patch('quick-charges/:id')
  @Roles(...ADMIN_ROLES)
  public async updateQuickCharge(
    @Param('id') id: string,
    @Body() body: UpdateQuickChargeRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<QuickChargeResponse> {
    const command = this.mapper.map(body, UpdateQuickChargeRequest, UpdateQuickChargeCommand);
    command.id = id;
    command.organizationId = requireOrganizationId(user);
    const result = await this.mediator.execute<UpdateQuickChargeCommand, QuickCharge>(command);
    return this.mapper.map(result, QuickCharge, QuickChargeResponse);
  }

  @ApiOperation({ summary: 'Delete a quick charge' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Quick charge UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete('quick-charges/:id')
  @Roles(...ADMIN_ROLES)
  public async deleteQuickCharge(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<boolean> {
    const command = new DeleteQuickChargeCommand();
    command.id = id;
    command.organizationId = requireOrganizationId(user);
    return this.mediator.execute<DeleteQuickChargeCommand, boolean>(command);
  }

  @ApiOperation({ summary: 'List customer type rules (ensures one row per type)' })
  @ApiOkResponse({ type: [CustomerTypeRuleResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('customer-type-rules')
  @Roles(...READ_ROLES)
  public async listCustomerTypeRules(@CurrentUser() user?: AuthenticatedUser): Promise<CustomerTypeRuleResponse[]> {
    const query = new ListCustomerTypeRulesQuery();
    query.organizationId = requireOrganizationId(user);
    return this.mediator.execute<ListCustomerTypeRulesQuery, CustomerTypeRuleResponse[]>(query);
  }

  @ApiOperation({ summary: 'Update a customer type rule' })
  @ApiOkResponse({ type: CustomerTypeRuleResponse })
  @ApiParam({ name: 'id', description: 'Customer type rule UUID' })
  @HttpCode(HttpStatus.OK)
  @Patch('customer-type-rules/:id')
  @Roles(...ADMIN_ROLES)
  public async updateCustomerTypeRule(
    @Param('id') id: string,
    @Body() body: UpdateCustomerTypeRuleRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CustomerTypeRuleResponse> {
    const command = this.mapper.map(body, UpdateCustomerTypeRuleRequest, UpdateCustomerTypeRuleCommand);
    command.id = id;
    command.organizationId = requireOrganizationId(user);
    const result = await this.mediator.execute<UpdateCustomerTypeRuleCommand, CustomerTypeRule>(command);
    return this.mapper.map(result, CustomerTypeRule, CustomerTypeRuleResponse);
  }
}
