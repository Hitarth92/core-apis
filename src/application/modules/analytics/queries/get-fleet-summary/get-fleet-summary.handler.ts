import { IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from 'src/common';
import { VEHICLE_REPO } from 'src/application/constants';
import { IVehicleRepo } from '../../../vehicles/repositories/i-vehicle.repo';
import { EVehicleStatus } from 'src/application/shared';
import { GetFleetSummaryKpisQuery } from './get-fleet-summary.query';
import { FleetSummaryResponse } from '../../models';

@QueryHandlerStrict(GetFleetSummaryKpisQuery)
export class GetFleetSummaryKpisHandler implements IQueryHandler<GetFleetSummaryKpisQuery, FleetSummaryResponse> {
  public constructor(
    @Inject(VEHICLE_REPO) private readonly vehicleRepo: IVehicleRepo,
    @InjectPinoLogger(GetFleetSummaryKpisHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: GetFleetSummaryKpisQuery): Promise<FleetSummaryResponse> {
    this.logger.info(`Executing Query '${GetFleetSummaryKpisQuery.name}'`);
    const allVehicles = await this.vehicleRepo.allAsync({ companyId: query.organizationId });

    return {
      totalVehicles:       allVehicles.length,
      activeVehicles:      allVehicles.filter(veh => veh.status === EVehicleStatus.Available || veh.status === EVehicleStatus.InTransit).length,
      inTransitVehicles:   allVehicles.filter(veh => veh.status === EVehicleStatus.InTransit).length,
      idleVehicles:        allVehicles.filter(veh => veh.status === EVehicleStatus.Idle).length,
      maintenanceVehicles: allVehicles.filter(veh => veh.status === EVehicleStatus.Maintenance).length,
      availableVehicles:   allVehicles.filter(veh => veh.status === EVehicleStatus.Available).length,
    };
  }
}
