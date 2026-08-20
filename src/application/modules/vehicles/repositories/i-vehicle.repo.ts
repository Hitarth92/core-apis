import { IBaseRepo } from "src/common";
import { Vehicle } from "../domain";

export type IVehicleRepo = IBaseRepo<Vehicle, string>;
