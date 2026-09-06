import { cpSync,mkdirSync } from 'node:fs';
mkdirSync('dist/generated',{recursive:true});
// Preserve generated native query engines and runtime assets, not duplicate TypeScript sources.
cpSync('src/generated','dist/generated',{recursive:true,filter:source=>!source.endsWith('.ts')});
