#!/bin/sh
set -eu
chown 472:0 /var/lib/grafana
exec su-exec 472:0 /run.sh "$@"
