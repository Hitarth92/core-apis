import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, CqrsMediator, CurrentUser, AuthenticatedUser, IPageable, Roles, RolesGuard, LocationNotFoundException, LocationNotOwnedByOrgException, assertLocationAccess } from 'src/common';
import { ERole } from 'src/infrastructure/persistence/entities/role.entity';
import { CreateLocationCommand, DeleteLocationCommand, RemoveLocationImageCommand, UpdateLocationCommand, UploadLocationImageCommand } from './commands';
import { Location } from './domain';
import { CreateLocationRequest, ListLocationsRequest, LocationResponse, LocationsPagedResponse, SearchLocationsRequest, UpdateLocationRequest } from './models';
import { GetLocationQuery, ListLocationsQuery, SearchLocationsQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Locations')
@Controller({ path: 'locations', version: '1' })
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager, ERole.StoreStaff)
export class LocationsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(LocationsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search locations (paginated)' })
  @ApiOkResponse({ type: LocationsPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager, ERole.StoreStaff)
  @Get()
  public async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: SearchLocationsRequest,
  ): Promise<LocationsPagedResponse> {
    const query              = this.mapper.map(filter, SearchLocationsRequest, SearchLocationsQuery);
    this.applyLocationScope(user, query, filter?.organizationId);
    const result             = await this.mediator.execute<SearchLocationsQuery, IPageable<Location>>(query);
    return { ...result, items: this.mapper.mapArray(result.items, Location, LocationResponse) };
  }

  @ApiOperation({ summary: 'List all locations' })
  @ApiOkResponse({ type: [LocationResponse] })
  @HttpCode(HttpStatus.OK)
  @Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager, ERole.StoreStaff)
  @Get('list')
  public async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: ListLocationsRequest,
  ): Promise<LocationResponse[]> {
    const query              = this.mapper.map(filter, ListLocationsRequest, ListLocationsQuery);
    this.applyLocationScope(user, query, filter?.organizationId);
    const result             = await this.mediator.execute<ListLocationsQuery, Location[]>(query);
    return this.mapper.mapArray(result, Location, LocationResponse);
  }

  @ApiOperation({ summary: 'Get location by ID' })
  @ApiOkResponse({ type: LocationResponse })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @HttpCode(HttpStatus.OK)
  @Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager, ERole.StoreStaff)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<LocationResponse> {
    const query  = new GetLocationQuery();
    query.id     = id;
    const result = await this.mediator.execute<GetLocationQuery, Location>(query);
    if (!result) throw new LocationNotFoundException(id);
    if (!user.roles?.includes(ERole.SuperAdmin) && result.organizationId !== user.organizationId) {
      throw new LocationNotOwnedByOrgException();
    }
    assertLocationAccess(user, result.id);
    return this.mapper.map(result, Location, LocationResponse);
  }

  @ApiOperation({ summary: 'Create a new location' })
  @ApiCreatedResponse({ type: LocationResponse })
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager)
  @Post()
  public async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateLocationRequest,
  ): Promise<LocationResponse> {
    const command            = this.mapper.map(body, CreateLocationRequest, CreateLocationCommand);
    const isSuperAdmin       = user.roles?.includes(ERole.SuperAdmin) ?? false;
    command.organizationId   = isSuperAdmin ? (body.organizationId ?? user.organizationId) : user.organizationId;
    if (!command.organizationId) throw new ForbiddenException('Organization is required');
    const result             = await this.mediator.execute<CreateLocationCommand, Location>(command);
    return this.mapper.map(result, Location, LocationResponse);
  }

  @ApiOperation({ summary: 'Update a location' })
  @ApiOkResponse({ type: LocationResponse })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @HttpCode(HttpStatus.OK)
  @Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateLocationRequest, @CurrentUser() user: AuthenticatedUser): Promise<LocationResponse> {
    const existing = await this.mediator.execute<GetLocationQuery, Location>(Object.assign(new GetLocationQuery(), { id }));
    if (!existing) throw new LocationNotFoundException(id);
    if (!user.roles?.includes(ERole.SuperAdmin) && existing.organizationId !== user.organizationId) {
      throw new LocationNotOwnedByOrgException();
    }
    assertLocationAccess(user, existing.id);
    const command = this.mapper.map(body, UpdateLocationRequest, UpdateLocationCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdateLocationCommand, Location>(command);
    return this.mapper.map(result, Location, LocationResponse);
  }

  @ApiOperation({ summary: 'Delete a location' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @HttpCode(HttpStatus.OK)
  @Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<boolean> {
    const existing = await this.mediator.execute<GetLocationQuery, Location>(Object.assign(new GetLocationQuery(), { id }));
    if (!existing) throw new LocationNotFoundException(id);
    if (!user.roles?.includes(ERole.SuperAdmin) && existing.organizationId !== user.organizationId) {
      throw new LocationNotOwnedByOrgException();
    }
    assertLocationAccess(user, existing.id);
    const command = new DeleteLocationCommand();
    command.id    = id;
    return this.mediator.execute<DeleteLocationCommand, boolean>(command);
  }

  @ApiOperation({ summary: 'Upload image for a location' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiCreatedResponse({ type: LocationResponse })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager)
  @Post(':id/image')
  public async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LocationResponse> {
    const existing = await this.mediator.execute<GetLocationQuery, Location>(Object.assign(new GetLocationQuery(), { id }));
    if (!existing) throw new LocationNotFoundException(id);
    if (!user.roles?.includes(ERole.SuperAdmin) && existing.organizationId !== user.organizationId) {
      throw new LocationNotOwnedByOrgException();
    }
    assertLocationAccess(user, existing.id);
    const command           = new UploadLocationImageCommand();
    command.locationId      = id;
    command.buffer          = file.buffer;
    command.mimeType        = file.mimetype;
    const result = await this.mediator.execute<UploadLocationImageCommand, Location>(command);
    return this.mapper.map(result, Location, LocationResponse);
  }

  @ApiOperation({ summary: 'Remove image from a location' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @HttpCode(HttpStatus.OK)
  @Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager)
  @Delete(':id/image')
  public async removeImage(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<boolean> {
    const existing = await this.mediator.execute<GetLocationQuery, Location>(Object.assign(new GetLocationQuery(), { id }));
    if (!existing) throw new LocationNotFoundException(id);
    if (!user.roles?.includes(ERole.SuperAdmin) && existing.organizationId !== user.organizationId) {
      throw new LocationNotOwnedByOrgException();
    }
    assertLocationAccess(user, existing.id);
    const command      = new RemoveLocationImageCommand();
    command.locationId = id;
    return this.mediator.execute<RemoveLocationImageCommand, boolean>(command);
  }

  private applyLocationScope(
    user: AuthenticatedUser,
    query: { organizationId?: string; $ids?: string[] },
    requestedOrganizationId?: string,
  ): void {
    const isSuperAdmin = user.roles?.includes(ERole.SuperAdmin) ?? false;
    if (isSuperAdmin) {
      query.organizationId = requestedOrganizationId ?? user.organizationId;
      return;
    }
    query.organizationId = user.organizationId;
    if (!user.hasOrgWideAccess) query.$ids = user.locationIds;
  }
}
