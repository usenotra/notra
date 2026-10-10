FROM prom/blackbox-exporter@sha256:c827aebdb688c29f3472bdfacff50c7c1e243ddfa3a7de76db41706d64646479
COPY blackbox.yml /etc/blackbox_exporter/config.yml
USER 65534:65534
CMD ["--config.file=/etc/blackbox_exporter/config.yml", "--web.listen-address=[::]:9115"]
