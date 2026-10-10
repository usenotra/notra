FROM grafana/loki:3.7.0@sha256:ac6ad1d73bd4c3c38edc93f91ebc217672fa657c20a5dc7b4b0e25baeec7bebb AS upstream
# Railway mounts volumes as root. Initialize ownership, then drop privileges.
FROM alpine:3.23@sha256:1f3591b8a02ea153f41c5bba878ad477f63ab3d19349762cb77504db02a23e15
RUN apk add --no-cache ca-certificates su-exec
COPY --from=upstream /usr/bin/loki /usr/bin/loki
COPY loki.yml /etc/loki/notra.yml
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
CMD ["-config.file=/etc/loki/notra.yml"]
