import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { ActivityLog } from './domain';

export type ActivityLogFilter = { organizationId?: string };

export type IActivityLogRepo = IBaseRepo<ActivityLog, string, PageableFilter<ActivityLogFilter>, Filter<ActivityLogFilter>>;
