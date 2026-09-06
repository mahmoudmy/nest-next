#!/bin/sh
set -eu
until mc alias set local http://minio:9000 qms_local qms_local_secret_only; do sleep 2; done
mc mb --ignore-existing local/qms-local
mc anonymous set none local/qms-local
