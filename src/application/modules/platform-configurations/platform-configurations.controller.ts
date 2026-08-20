import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles } from '../../../common';
import { ERole } from '../../../infrastructure';
import { CreatePlatformConfigurationCommand } from './commands';
import { PlatformConfiguration } from './domain';
import { CreatePlatformConfigurationRequest, PlatformConfigurationResponse } from './models';
import { GetPlatformConfigurationQuery } from './queries';

@ApiBearerAuth()
@ApiTags('PlatformConfigurations')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'platform-configurations', version: '1' })
export class PlatformConfigurationsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(PlatformConfigurationsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Get configuration by ID' })
  @ApiOkResponse({ type: PlatformConfigurationResponse })
  @ApiParam({ name: 'id', description: 'PlatformConfiguration UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string): Promise<PlatformConfigurationResponse> {
    const query = new GetPlatformConfigurationQuery();
    query.id = id;
    const result = await this.mediator.execute<GetPlatformConfigurationQuery, PlatformConfiguration>(query);
    return this.mapper.map(result, PlatformConfiguration, PlatformConfigurationResponse);
  }

  @ApiOperation({ summary: 'Create a new configuration' })
  @ApiCreatedResponse({ type: PlatformConfigurationResponse })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Post()
  public async create(@Body() body: CreatePlatformConfigurationRequest): Promise<PlatformConfigurationResponse> {
    const command = this.mapper.map(body, CreatePlatformConfigurationRequest, CreatePlatformConfigurationCommand);
    const result  = await this.mediator.execute<CreatePlatformConfigurationCommand, PlatformConfiguration>(command);
    return this.mapper.map(result, PlatformConfiguration, PlatformConfigurationResponse);
  }
}
