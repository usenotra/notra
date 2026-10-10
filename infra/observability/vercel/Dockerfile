FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
WORKDIR /app
COPY constants constants
COPY utils utils
COPY schemas schemas
COPY types types
COPY server.ts server.ts
USER 1000:1000
EXPOSE 9091
CMD ["node", "server.ts"]
