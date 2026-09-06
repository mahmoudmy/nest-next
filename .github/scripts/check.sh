#!/usr/bin/env bash
set -uo pipefail
phase="$1"; shift
log="$(mktemp)"
"$@" 2>&1 | tee "$log"
result=${PIPESTATUS[0]}
if [ "$result" -ne 0 ]; then
  detail="$(tail -c 12000 "$log")"
  detail="${detail//'%'/'%25'}"
  detail="${detail//$'\r'/'%0D'}"
  detail="${detail//$'\n'/'%0A'}"
  printf '::error title=%s check failed::%s\n' "$phase" "$detail"
fi
rm -f "$log"
exit "$result"
