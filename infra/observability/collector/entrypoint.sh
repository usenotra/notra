#!/bin/sh
set -eu
chown -R 10001:10001 /var/lib/otelcol
exec su-exec 10001:10001 /otelcol-contrib "$@"
