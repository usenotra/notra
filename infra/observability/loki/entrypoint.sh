#!/bin/sh
set -eu
chown 10001:10001 /loki
exec su-exec 10001:10001 /usr/bin/loki "$@"
