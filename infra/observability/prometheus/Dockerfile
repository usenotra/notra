FROM prom/prometheus@sha256:86b17a25c2db1d16a61b16b3c8f336679eb19e26333d03e808da387206e40faa AS upstream
FROM alpine:3.23@sha256:1f3591b8a02ea153f41c5bba878ad477f63ab3d19349762cb77504db02a23e15
RUN apk add --no-cache ca-certificates su-exec
COPY --from=upstream /bin/prometheus /bin/prometheus
COPY --from=upstream /bin/promtool /bin/promtool
COPY prometheus.yml /etc/prometheus/prometheus.yml
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
CMD ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus", "--storage.tsdb.retention.time=30d", "--storage.tsdb.retention.size=4GB", "--web.listen-address=[::]:9090", "--query.max-concurrency=4", "--query.max-samples=5000000"]
