import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles } from '../../../common';
import { ERole } from '../../../infrastructure';
import { CreateRoleCommand } from './commands';
import { Role } from './domain';
import { CreateRoleRequest, RoleResponse } from './models';
import { GetRoleQuery, ListRolesQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Roles')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(RolesController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'List all roles' })
  @ApiOkResponse({ type: [RoleResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(): Promise<RoleResponse[]> {
    const query = new ListRolesQuery();
    return this.mediator.execute<ListRolesQuery, RoleResponse[]>(query);
  }

  @ApiOperation({ summary: 'Get role by ID' })
  @ApiOkResponse({ type: RoleResponse })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string): Promise<RoleResponse> {
    const query = new GetRoleQuery();
    query.id = id;
    const result = await this.mediator.execute<GetRoleQuery, Role>(query);
    return this.mapper.map(result, Role, RoleResponse);
  }

  @ApiOperation({ summary: 'Create a new role' })
  @ApiCreatedResponse({ type: RoleResponse })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Post()
  public async create(@Body() body: CreateRoleRequest): Promise<RoleResponse> {
    const command = this.mapper.map(body, CreateRoleRequest, CreateRoleCommand);
    const result  = await this.mediator.execute<CreateRoleCommand, Role>(command);
    return this.mapper.map(result, Role, RoleResponse);
  }
}
