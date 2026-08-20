import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Get, HttpCode, HttpStatus, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, CqrsMediator, IPageable, Roles, RolesGuard } from '../../../common';
import { ERole } from '../../../infrastructure';
import { Country, State, City, Currency, Language } from './domain';
import {
  ListCountriesRequest, SearchCountriesRequest, CountriesPagedResponse, CountryResponse,
  ListStatesRequest, SearchStatesRequest, StatesPagedResponse, StateResponse,
  ListCitiesRequest, SearchCitiesRequest, CitiesPagedResponse, CityResponse,
  ListCurrenciesRequest, SearchCurrenciesRequest, CurrenciesPagedResponse, CurrencyResponse,
  ListLanguagesRequest, SearchLanguagesRequest, LanguagesPagedResponse, LanguageResponse,
  UpdatePageAccessRequest, PageAccessConfigResponse,
} from './models';
import {
  ListCountriesQuery, SearchCountriesQuery,
  ListStatesQuery, SearchStatesQuery,
  ListCitiesQuery, SearchCitiesQuery,
  ListCurrenciesQuery, SearchCurrenciesQuery,
  ListLanguagesQuery, SearchLanguagesQuery,
  GetPageAccessQuery,
} from './queries';
import { UpdatePageAccessCommand } from './commands';

@ApiBearerAuth()
@ApiTags('Common Utility')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'common-utility', version: '1' })
export class CommonUtilityController {
  public constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(CommonUtilityController.name) protected readonly logger: PinoLogger,
  ) {}

  // ── Page Access ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get all page-access configurations' })
  @ApiOkResponse({ type: [PageAccessConfigResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('page-access')
  public async getPageAccess(): Promise<PageAccessConfigResponse[]> {
    return this.mediator.execute<GetPageAccessQuery, PageAccessConfigResponse[]>(
      new GetPageAccessQuery(),
    );
  }

  @ApiOperation({ summary: 'Bulk-upsert page-access configurations (SuperAdmin only)' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Put('page-access')
  public async updatePageAccess(@Body() body: UpdatePageAccessRequest): Promise<void> {
    const command   = new UpdatePageAccessCommand();
    command.configs = body.configs;
    await this.mediator.execute<UpdatePageAccessCommand, void>(command);
  }

  // ── Countries ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Search countries (paginated)' })
  @ApiOkResponse({ type: CountriesPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get('countries')
  public async searchCountries(@Query() filter?: SearchCountriesRequest): Promise<CountriesPagedResponse> {
    const query = this.mapper.map(filter, SearchCountriesRequest, SearchCountriesQuery);
    const result = await this.mediator.execute<SearchCountriesQuery, IPageable<Country>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, Country, CountryResponse),
    };
  }

  @ApiOperation({ summary: 'List all countries' })
  @ApiOkResponse({ type: [CountryResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('countries/list')
  public async listCountries(@Query() filter?: ListCountriesRequest): Promise<CountryResponse[]> {
    const query = this.mapper.map(filter, ListCountriesRequest, ListCountriesQuery);
    const result = await this.mediator.execute<ListCountriesQuery, Country[]>(query);
    return this.mapper.mapArray(result, Country, CountryResponse);
  }

  // ── States ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Search states (paginated)' })
  @ApiOkResponse({ type: StatesPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get('states')
  public async searchStates(@Query() filter?: SearchStatesRequest): Promise<StatesPagedResponse> {
    const query = this.mapper.map(filter, SearchStatesRequest, SearchStatesQuery);
    const result = await this.mediator.execute<SearchStatesQuery, IPageable<State>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, State, StateResponse),
    };
  }

  @ApiOperation({ summary: 'List all states' })
  @ApiOkResponse({ type: [StateResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('states/list')
  public async listStates(@Query() filter?: ListStatesRequest): Promise<StateResponse[]> {
    const query = this.mapper.map(filter, ListStatesRequest, ListStatesQuery);
    const result = await this.mediator.execute<ListStatesQuery, State[]>(query);
    return this.mapper.mapArray(result, State, StateResponse);
  }

  // ── Cities ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Search cities (paginated)' })
  @ApiOkResponse({ type: CitiesPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get('cities')
  public async searchCities(@Query() filter?: SearchCitiesRequest): Promise<CitiesPagedResponse> {
    const query = this.mapper.map(filter, SearchCitiesRequest, SearchCitiesQuery);
    const result = await this.mediator.execute<SearchCitiesQuery, IPageable<City>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, City, CityResponse),
    };
  }

  @ApiOperation({ summary: 'List all cities' })
  @ApiOkResponse({ type: [CityResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('cities/list')
  public async listCities(@Query() filter?: ListCitiesRequest): Promise<CityResponse[]> {
    const query = this.mapper.map(filter, ListCitiesRequest, ListCitiesQuery);
    const result = await this.mediator.execute<ListCitiesQuery, City[]>(query);
    return this.mapper.mapArray(result, City, CityResponse);
  }

  // ── Currencies ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Search currencies (paginated)' })
  @ApiOkResponse({ type: CurrenciesPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get('currencies')
  public async searchCurrencies(@Query() filter?: SearchCurrenciesRequest): Promise<CurrenciesPagedResponse> {
    const query = this.mapper.map(filter, SearchCurrenciesRequest, SearchCurrenciesQuery);
    const result = await this.mediator.execute<SearchCurrenciesQuery, IPageable<Currency>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, Currency, CurrencyResponse),
    };
  }

  @ApiOperation({ summary: 'List all currencies' })
  @ApiOkResponse({ type: [CurrencyResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('currencies/list')
  public async listCurrencies(@Query() filter?: ListCurrenciesRequest): Promise<CurrencyResponse[]> {
    const query = this.mapper.map(filter, ListCurrenciesRequest, ListCurrenciesQuery);
    const result = await this.mediator.execute<ListCurrenciesQuery, Currency[]>(query);
    return this.mapper.mapArray(result, Currency, CurrencyResponse);
  }

  // ── Languages ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Search languages (paginated)' })
  @ApiOkResponse({ type: LanguagesPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get('languages')
  public async searchLanguages(@Query() filter?: SearchLanguagesRequest): Promise<LanguagesPagedResponse> {
    const query = this.mapper.map(filter, SearchLanguagesRequest, SearchLanguagesQuery);
    const result = await this.mediator.execute<SearchLanguagesQuery, IPageable<Language>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, Language, LanguageResponse),
    };
  }

  @ApiOperation({ summary: 'List all languages' })
  @ApiOkResponse({ type: [LanguageResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('languages/list')
  public async listLanguages(@Query() filter?: ListLanguagesRequest): Promise<LanguageResponse[]> {
    const query = this.mapper.map(filter, ListLanguagesRequest, ListLanguagesQuery);
    const result = await this.mediator.execute<ListLanguagesQuery, Language[]>(query);
    return this.mapper.mapArray(result, Language, LanguageResponse);
  }
}
