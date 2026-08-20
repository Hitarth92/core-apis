import { IBaseRepo } from "src/common";
import { Trip } from "../domain";


export type ITripRepo = IBaseRepo<Trip, string>;
