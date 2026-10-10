#!/bin/sh
set -eu
chown 65534:65534 /prometheus
exec su-exec 65534:65534 /bin/prometheus "$@"
