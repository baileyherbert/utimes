# This is used to build bindings for armv7 and arm64

ARG NODE_VERSION
FROM node:${NODE_VERSION}

COPY . .

RUN npm ci -d --unsafe-perm
RUN npm test
