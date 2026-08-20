import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, Roles, RolesGuard, assertOrgOwnership } from '../../../common';
import { ERole } from '../../../infrastructure';
import { CreateCategoryCommand, DeleteCategoryCommand, UpdateCategoryCommand } from './commands';
import { Category } from './domain';
import { CreateCategoryRequest, SearchCategoriesRequest, ListCategoriesRequest, ListParentCategoriesRequest, CategoryResponse, CategorysPagedResponse, UpdateCategoryRequest } from './models';
import { GetCategoryQuery, ListCategoriesQuery, ListParentCategoriesQuery, SearchCategoriesQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Categories')
@Controller({ path: 'categories', version: '1' })
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(ERole.OrgAdmin, ERole.SuperAdmin)
export class CategoriesController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(CategoriesController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search categories (paginated)' })
  @ApiOkResponse({ type: CategorysPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: SearchCategoriesRequest,
  ): Promise<CategorysPagedResponse> {
    const query = this.mapper.map(filter, SearchCategoriesRequest, SearchCategoriesQuery);
    query.organizationId = user.organizationId;
    const result = await this.mediator.execute<SearchCategoriesQuery, IPageable<Category>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, Category, CategoryResponse),
    };
  }

  @ApiOperation({ summary: 'List all categories' })
  @ApiOkResponse({ type: [CategoryResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: ListCategoriesRequest,
  ): Promise<CategoryResponse[]> {
    const query = this.mapper.map(filter, ListCategoriesRequest, ListCategoriesQuery);
    query.organizationId = user.organizationId;
    const result = await this.mediator.execute<ListCategoriesQuery, Category[]>(query);
    return this.mapper.mapArray(result, Category, CategoryResponse);
  }

  @ApiOperation({ summary: 'List all root (parent) categories — use to populate parent selector when creating sub-categories' })
  @ApiOkResponse({ type: [CategoryResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('parents')
  public async listParents(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: ListParentCategoriesRequest,
  ): Promise<CategoryResponse[]> {
    const query  = this.mapper.map(filter, ListParentCategoriesRequest, ListParentCategoriesQuery);
    query.organizationId = user.organizationId;
    const result = await this.mediator.execute<ListParentCategoriesQuery, Category[]>(query);
    return this.mapper.mapArray(result, Category, CategoryResponse);
  }

  @ApiOperation({ summary: 'Get category by ID' })
  @ApiOkResponse({ type: CategoryResponse })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<CategoryResponse> {
    const query = new GetCategoryQuery();
    query.id = id;
    const result = await this.mediator.execute<GetCategoryQuery, Category>(query);
    assertOrgOwnership(user, result.organizationId, 'Category');
    return this.mapper.map(result, Category, CategoryResponse);
  }

  @ApiOperation({ summary: 'Create a new category' })
  @ApiCreatedResponse({ type: CategoryResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCategoryRequest,
  ): Promise<CategoryResponse> {
    const command = this.mapper.map(body, CreateCategoryRequest, CreateCategoryCommand);
    command.organizationId = user.organizationId;
    const result = await this.mediator.execute<CreateCategoryCommand, Category>(command);
    return this.mapper.map(result, Category, CategoryResponse);
  }

  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ type: CategoryResponse })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateCategoryRequest, @CurrentUser() user: AuthenticatedUser): Promise<CategoryResponse> {
    const fetchQuery = new GetCategoryQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetCategoryQuery, Category>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Category');
    const command = this.mapper.map(body, UpdateCategoryRequest, UpdateCategoryCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdateCategoryCommand, Category>(command);
    return this.mapper.map(result, Category, CategoryResponse);
  }

  @ApiOperation({ summary: 'Delete a category' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<boolean> {
    const fetchQuery = new GetCategoryQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetCategoryQuery, Category>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Category');
    const command = new DeleteCategoryCommand();
    command.id    = id;
    return this.mediator.execute<DeleteCategoryCommand, boolean>(command);
  }
}
