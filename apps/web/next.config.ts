import type { NextConfig } from 'next';
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({path:resolve(process.cwd(),'../../.env')});
const backend=process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
if (process.env.NODE_ENV==='production' && !process.env.API_INTERNAL_URL) throw new Error('API_INTERNAL_URL must be set for production builds');
const nextConfig:NextConfig={poweredByHeader:false,transpilePackages:['@qms/contracts'],async rewrites(){return [{source:'/api/:path*',destination:`${backend}/api/:path*`}];},async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]}];}};
export default nextConfig;
