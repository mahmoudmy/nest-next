import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
config();
export default defineConfig({test:{include:['packages/**/*.test.ts','apps/**/*.test.ts'],testTimeout:20000,fileParallelism:false},resolve:{alias:{'@qms/database':new URL('./packages/database/src/index.ts',import.meta.url).pathname,'@qms/auth':new URL('./packages/auth/src/index.ts',import.meta.url).pathname,'@qms/workflow':new URL('./packages/workflow/src/index.ts',import.meta.url).pathname,'@qms/contracts':new URL('./packages/contracts/src/index.ts',import.meta.url).pathname,'@qms/config':new URL('./packages/config/src/index.ts',import.meta.url).pathname,'@qms/types':new URL('./packages/types/src/index.ts',import.meta.url).pathname}}});
