import { z } from 'zod';
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({path:resolve(process.cwd(),'.env')});
config({path:resolve(process.cwd(),'../../.env')});
const schema = z.object({NODE_ENV:z.enum(['development','test','production']).default('development'),DATABASE_URL:z.string().url(),APP_ORIGIN:z.string().url(),PORT:z.coerce.number().int().default(3001),SESSION_TTL_SECONDS:z.coerce.number().int().min(300).max(86400).default(28800),S3_ENDPOINT:z.string().url().optional(),S3_REGION:z.string().min(1),S3_BUCKET:z.string().min(1),S3_ACCESS_KEY_ID:z.string().min(1),S3_SECRET_ACCESS_KEY:z.string().min(1)});
export const environment = () => {
  const env = schema.parse(process.env);
  if (env.NODE_ENV === 'production' && (!env.APP_ORIGIN.startsWith('https://') || env.S3_ACCESS_KEY_ID === 'qms_local')) throw new Error('Production requires HTTPS and production storage credentials');
  return env;
};
