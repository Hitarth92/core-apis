import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, Roles, RolesGuard, AuthenticatedUser, assertOrgOwnership } from '../../../common';
import { ERole } from '../../../infrastructure';
import { AddProductImageCommand, CreateProductCommand, DeleteProductCommand, LinkProductSupplierCommand, UnlinkProductSupplierCommand, UpdateProductCommand, UpdateProductSupplierCommand } from './commands';
import { Product, ProductSupplier } from './domain';
import { CreateProductRequest, GetNextSkuRequest, GetProductImageUploadUrlRequest, LinkProductSupplierRequest, ListProductsRequest, NextSkuResponse, ProductImageResponse, ProductImageUploadUrlResponse, ProductResponse, ProductSupplierResponse, ProductsPagedResponse, SearchProductsRequest, UpdateProductRequest, UpdateProductSupplierRequest } from './models';
import { GetNextSkuQuery, GetProductQuery, GetProductImageUploadUrlQuery, ListProductImagesQuery, ListProductSuppliersQuery, ListProductsQuery, SearchProductsQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Products')
@Controller({ path: 'products', version: '1' })
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(ERole.OrgAdmin, ERole.SuperAdmin)
export class ProductsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(ProductsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search products (paginated)' })
  @ApiOkResponse({ type: ProductsPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: SearchProductsRequest,
  ): Promise<ProductsPagedResponse> {
    const query = this.mapper.map(filter, SearchProductsRequest, SearchProductsQuery);
    query.organizationId = user.organizationId;
    const result = await this.mediator.execute<SearchProductsQuery, IPageable<Product>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, Product, ProductResponse),
    };
  }

  @ApiOperation({ summary: 'List all products' })
  @ApiOkResponse({ type: [ProductResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: ListProductsRequest,
  ): Promise<ProductResponse[]> {
    const query = this.mapper.map(filter, ListProductsRequest, ListProductsQuery);
    query.organizationId = user.organizationId;
    const result = await this.mediator.execute<ListProductsQuery, Product[]>(query);
    return this.mapper.mapArray(result, Product, ProductResponse);
  }

  @ApiOperation({ summary: 'Preview the next auto-generated SKU for a product name' })
  @ApiOkResponse({ type: NextSkuResponse })
  @HttpCode(HttpStatus.OK)
  @Get('next-sku')
  public async getNextSku(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryParams: GetNextSkuRequest,
  ): Promise<NextSkuResponse> {
    const query = new GetNextSkuQuery();
    query.name = queryParams.name;
    query.organizationId = user.organizationId;
    return this.mediator.execute<GetNextSkuQuery, NextSkuResponse>(query);
  }

  @ApiOperation({ summary: 'Get product by ID' })
  @ApiOkResponse({ type: ProductResponse })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<ProductResponse> {
    const query = new GetProductQuery();
    query.id = id;
    const result = await this.mediator.execute<GetProductQuery, Product>(query);
    assertOrgOwnership(user, result.organizationId, 'Product');
    return this.mapper.map(result, Product, ProductResponse);
  }

  @ApiOperation({ summary: 'Create a new product' })
  @ApiCreatedResponse({ type: ProductResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateProductRequest,
  ): Promise<ProductResponse> {
    const command = this.mapper.map(body, CreateProductRequest, CreateProductCommand);
    command.organizationId = user.organizationId;
    command.createdById    = user.dbUserId;
    const result = await this.mediator.execute<CreateProductCommand, Product>(command);
    return this.mapper.map(result, Product, ProductResponse);
  }

  @ApiOperation({ summary: 'Update a product' })
  @ApiOkResponse({ type: ProductResponse })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateProductRequest, @CurrentUser() user: AuthenticatedUser): Promise<ProductResponse> {
    const fetchQuery = new GetProductQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetProductQuery, Product>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Product');
    const command = this.mapper.map(body, UpdateProductRequest, UpdateProductCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdateProductCommand, Product>(command);
    return this.mapper.map(result, Product, ProductResponse);
  }

  @ApiOperation({ summary: 'Delete a product' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<boolean> {
    const fetchQuery = new GetProductQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetProductQuery, Product>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Product');
    const command = new DeleteProductCommand();
    command.id    = id;
    return this.mediator.execute<DeleteProductCommand, boolean>(command);
  }

  @ApiOperation({ summary: 'Upload an image for a product (stored in B2; key saved to product_images)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiCreatedResponse({ type: ProductImageResponse })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @Post(':id/images')
  public async addImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProductImageResponse> {
    const fetchQuery = new GetProductQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetProductQuery, Product>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Product');
    const command = new AddProductImageCommand();
    command.productId    = id;
    command.buffer       = file.buffer;
    command.mimeType     = file.mimetype;
    command.uploadedById = user.dbUserId;
    return this.mediator.execute<AddProductImageCommand, ProductImageResponse>(command);
  }

  @ApiOperation({ summary: 'List images for a product' })
  @ApiOkResponse({ type: [ProductImageResponse] })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/images')
  public async listImages(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<ProductImageResponse[]> {
    const fetchQuery = new GetProductQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetProductQuery, Product>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Product');
    const query = new ListProductImagesQuery();
    query.productId = id;
    return this.mediator.execute<ListProductImagesQuery, ProductImageResponse[]>(query);
  }

  @ApiOperation({ summary: 'Get presigned URL for direct client-side image upload to R2' })
  @ApiOkResponse({ type: ProductImageUploadUrlResponse })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/image/presigned-url')
  public async getImagePresignedUrl(
    @Param('id') id: string,
    @Query() queryParams: GetProductImageUploadUrlRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductImageUploadUrlResponse> {
    const fetchQuery = new GetProductQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetProductQuery, Product>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Product');
    const query = new GetProductImageUploadUrlQuery();
    query.productId = id;
    query.mimeType  = queryParams.mimeType;
    return this.mediator.execute<GetProductImageUploadUrlQuery, ProductImageUploadUrlResponse>(query);
  }

  @ApiOperation({ summary: 'List all suppliers linked to a product' })
  @ApiOkResponse({ type: [ProductSupplierResponse] })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/suppliers')
  public async listSuppliers(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<ProductSupplierResponse[]> {
    const fetchQuery = new GetProductQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetProductQuery, Product>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Product');
    const query     = new ListProductSuppliersQuery();
    query.productId = id;
    const result    = await this.mediator.execute<ListProductSuppliersQuery, ProductSupplier[]>(query);
    return this.mapper.mapArray(result, ProductSupplier, ProductSupplierResponse);
  }

  @ApiOperation({ summary: 'Link a supplier to a product' })
  @ApiCreatedResponse({ type: ProductSupplierResponse })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/suppliers')
  public async linkSupplier(
    @Param('id') id: string,
    @Body() body: LinkProductSupplierRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductSupplierResponse> {
    const fetchQuery = new GetProductQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetProductQuery, Product>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Product');
    const command     = this.mapper.map(body, LinkProductSupplierRequest, LinkProductSupplierCommand);
    command.productId = id;
    const result      = await this.mediator.execute<LinkProductSupplierCommand, ProductSupplier>(command);
    return this.mapper.map(result, ProductSupplier, ProductSupplierResponse);
  }

  @ApiOperation({ summary: 'Update a supplier link (isDefault, unitCost, leadTimeDays, minOrderQty)' })
  @ApiOkResponse({ type: ProductSupplierResponse })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'supplierId', description: 'Supplier UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id/suppliers/:supplierId')
  public async updateSupplierLink(
    @Param('id') id: string,
    @Param('supplierId') supplierId: string,
    @Body() body: UpdateProductSupplierRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductSupplierResponse> {
    const fetchQuery = new GetProductQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetProductQuery, Product>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Product');
    const command       = this.mapper.map(body, UpdateProductSupplierRequest, UpdateProductSupplierCommand);
    command.productId   = id;
    command.supplierId  = supplierId;
    const result        = await this.mediator.execute<UpdateProductSupplierCommand, ProductSupplier>(command);
    return this.mapper.map(result, ProductSupplier, ProductSupplierResponse);
  }

  @ApiOperation({ summary: 'Unlink a supplier from a product' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'supplierId', description: 'Supplier UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id/suppliers/:supplierId')
  public async unlinkSupplier(
    @Param('id') id: string,
    @Param('supplierId') supplierId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<boolean> {
    const fetchQuery = new GetProductQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetProductQuery, Product>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Product');
    const command      = new UnlinkProductSupplierCommand();
    command.productId  = id;
    command.supplierId = supplierId;
    return this.mediator.execute<UnlinkProductSupplierCommand, boolean>(command);
  }
}
