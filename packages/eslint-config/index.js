import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ignores:['**/dist/**','**/.next/**','**/node_modules/**','**/next-env.d.ts','packages/database/src/generated/**']},js.configs.recommended,...ts.configs.recommended,{files:['**/*.{ts,tsx}'],rules:{'@typescript-eslint/no-explicit-any':'error','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}});
