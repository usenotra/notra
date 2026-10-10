FROM otel/opentelemetry-collector-contrib@sha256:340885ab6f46822374f00c58c067396b53b8d612559842e8821585567579d9e3 AS upstream
FROM alpine:3.23@sha256:1f3591b8a02ea153f41c5bba878ad477f63ab3d19349762cb77504db02a23e15
RUN apk add --no-cache ca-certificates su-exec
COPY --from=upstream /otelcol-contrib /otelcol-contrib
COPY collector.yml /etc/otelcol-contrib/notra.yml
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
CMD ["--config=/etc/otelcol-contrib/notra.yml"]
