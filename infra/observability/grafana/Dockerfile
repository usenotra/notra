FROM grafana/grafana:13.0.2@sha256:b8f6abae513b839b2f3487343fa5e44d9c9d7871271fdd17689c4c452cb8098e
USER root
RUN apk add --no-cache su-exec
COPY provisioning /etc/grafana/provisioning
COPY dashboards /etc/grafana/dashboards
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
ENV GF_SERVER_HTTP_ADDR=:: \
    GF_SERVER_HTTP_PORT=3000 \
    GF_SERVER_ROOT_URL=https://grafana.usenotra.com \
    GF_AUTH_ANONYMOUS_ENABLED=false \
    GF_AUTH_PROXY_ENABLED=true \
    GF_AUTH_PROXY_HEADER_NAME=Cf-Access-Authenticated-User-Email \
    GF_AUTH_PROXY_HEADER_PROPERTY=email \
    GF_AUTH_PROXY_AUTO_SIGN_UP=true \
    GF_AUTH_PROXY_ENABLE_LOGIN_TOKEN=false \
    GF_USERS_AUTO_ASSIGN_ORG_ROLE=Viewer \
    GF_USERS_ALLOW_SIGN_UP=false \
    GF_USERS_ALLOW_ORG_CREATE=false \
    GF_SECURITY_COOKIE_SECURE=true \
    GF_SECURITY_COOKIE_SAMESITE=lax \
    GF_SECURITY_DISABLE_GRAVATAR=true \
    GF_SNAPSHOTS_EXTERNAL_ENABLED=false \
    GF_ANALYTICS_REPORTING_ENABLED=false \
    GF_ANALYTICS_CHECK_FOR_UPDATES=false \
    GF_PLUGINS_PREINSTALL_DISABLED=true
