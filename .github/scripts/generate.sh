#!/usr/bin/env bash
set -euo pipefail
node -e "console.log('root client:',require.resolve('@prisma/client/package.json')); console.log('client version:',require('@prisma/client/package.json').version)"
(cd packages/database && node -e "console.log('database client:',require.resolve('@prisma/client/package.json'))")
PRISMA_GENERATE_SKIP_AUTOINSTALL=1 pnpm db:generate
