import type { Request } from 'express';
import type { TenantContext } from '@qms/types';
export interface AuthenticatedRequest extends Request { context:TenantContext }
