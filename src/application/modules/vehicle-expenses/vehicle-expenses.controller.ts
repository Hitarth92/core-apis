import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, RolesGuard, Roles, requireOrganizationId, assertOrgOwnership } from '../../../common';
import { CreateVehicleExpenseRequest, VehicleExpenseResponse } from './models';
import { VehicleExpense } from './domain';
import { CreateVehicleExpenseCommand, DeleteVehicleExpenseCommand } from './commands';
import { GetVehicleExpenseQuery } from './queries';
import { ERole } from '../../../infrastructure';
import { GetVehicleQuery } from '../vehicles/queries';
import { Vehicle } from '../vehicles/domain';

@ApiBearerAuth()
@ApiTags('Vehicle Expenses')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'vehicle-expenses', version: '1' })
export class VehicleExpensesController {
  public constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(VehicleExpensesController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Get vehicle expense by ID' })
  @ApiOkResponse({ type: VehicleExpenseResponse })
  @ApiParam({ name: 'id', description: 'Vehicle Expense UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<VehicleExpenseResponse> {
    const query  = new GetVehicleExpenseQuery();
    query.id     = id;
    const result = await this.mediator.execute<GetVehicleExpenseQuery, VehicleExpense>(query);
    const vehicleQuery = new GetVehicleQuery();
    vehicleQuery.id = result.vehicleId;
    const vehicle = await this.mediator.execute<GetVehicleQuery, Vehicle>(vehicleQuery);
    assertOrgOwnership(user, vehicle.companyId, 'Vehicle Expense');
    return this.mapper.map(result, VehicleExpense, VehicleExpenseResponse);
  }

  @ApiOperation({ summary: 'Create a new vehicle expense' })
  @ApiCreatedResponse({ type: VehicleExpenseResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @Body() body: CreateVehicleExpenseRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<VehicleExpenseResponse> {
    const command           = this.mapper.map(body, CreateVehicleExpenseRequest, CreateVehicleExpenseCommand);
    command.organizationId  = requireOrganizationId(user);
    const result            = await this.mediator.execute<CreateVehicleExpenseCommand, VehicleExpense>(command);
    return this.mapper.map(result, VehicleExpense, VehicleExpenseResponse);
  }

  @ApiOperation({ summary: 'Delete a vehicle expense' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Vehicle Expense UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
    const command = new DeleteVehicleExpenseCommand();
    command.id    = id;
    return this.mediator.execute<DeleteVehicleExpenseCommand, boolean>(command);
  }
}
