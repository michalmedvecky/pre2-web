# Same official multi-platform nginx base used by Golden Axe, pinned immutably.
ARG NGINX_IMAGE=nginx:stable-alpine@sha256:0e52bd054126cdc040b1276c0af347aeb02a41b9cfe305d6094767ac30e97949
FROM ${NGINX_IMAGE}
ARG NGINX_IMAGE
ARG VCS_REF=unknown
ARG BUILD_SOURCE=local
ARG BUILD_DIRTY=unknown
ARG SOURCE_SNAPSHOT=unknown
ARG BUILD_REPOSITORY=https://github.com/michalmedvecky/remastered
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY dist/ /usr/share/nginx/html/
COPY scripts/write-build-info.sh /tmp/flappy-write-build-info.sh
RUN case "$NGINX_IMAGE" in nginx@sha256:*|nginx:*@sha256:*|docker.io/library/nginx@sha256:*|docker.io/library/nginx:*@sha256:*) ;; *) echo 'NGINX_IMAGE must pin official nginx by digest' >&2; exit 2;; esac \
    && digest="${NGINX_IMAGE##*@sha256:}" \
    && case "$digest" in *[!0-9a-f]*|'') exit 2;; esac \
    && test "${#digest}" -eq 64 \
    && /bin/sh /tmp/flappy-write-build-info.sh /usr/share/nginx/html/build.json \
    && rm /tmp/flappy-write-build-info.sh
LABEL org.opencontainers.image.title="Flappy PMD 85 web remaster" \
      org.opencontainers.image.source="${BUILD_REPOSITORY}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      io.flappy.source-snapshot="${SOURCE_SNAPSHOT}"
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
