ARG NGINX_IMAGE=nginx:stable-alpine@sha256:0e52bd054126cdc040b1276c0af347aeb02a41b9cfe305d6094767ac30e97949
FROM ${NGINX_IMAGE}
ARG NGINX_IMAGE
ARG VCS_REF=unknown
ARG BUILD_SOURCE=unknown
ARG BUILD_DIRTY=unknown
ARG BUILD_REPOSITORY=https://github.com/michalmedvecky/remastered
ARG SOURCE_SNAPSHOT=unknown
ARG GA_SNAPSHOT=unknown
ARG PRE2_SNAPSHOT=unknown
ARG FLAPPY_SNAPSHOT=unknown
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY portal/dist/ /usr/share/nginx/html/
COPY pre2/dist/ /usr/share/nginx/html/pre2/
COPY ga/dist/ /usr/share/nginx/html/ga/
COPY flappy/dist/ /usr/share/nginx/html/flappy/
COPY scripts/write-build-info.sh /tmp/write-build-info.sh
RUN case "$NGINX_IMAGE" in nginx@sha256:*|nginx:*@sha256:*|docker.io/library/nginx@sha256:*|docker.io/library/nginx:*@sha256:*) ;; *) echo 'Pin official nginx by SHA256 digest' >&2; exit 2;; esac \
    && digest="${NGINX_IMAGE##*@sha256:}" \
    && case "$digest" in *[!0-9a-f]*|'') exit 2;; esac \
    && test "${#digest}" -eq 64 \
    && /bin/sh /tmp/write-build-info.sh /usr/share/nginx/html/build.json \
    && SOURCE_SNAPSHOT="$PRE2_SNAPSHOT" /bin/sh /tmp/write-build-info.sh /usr/share/nginx/html/pre2/build.json \
    && SOURCE_SNAPSHOT="$GA_SNAPSHOT" /bin/sh /tmp/write-build-info.sh /usr/share/nginx/html/ga/build.json \
    && SOURCE_SNAPSHOT="$FLAPPY_SNAPSHOT" /bin/sh /tmp/write-build-info.sh /usr/share/nginx/html/flappy/build.json \
    && rm /tmp/write-build-info.sh
LABEL org.opencontainers.image.title="Remastered games" \
      org.opencontainers.image.source="${BUILD_REPOSITORY}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      io.remastered.source-snapshot="${SOURCE_SNAPSHOT}"
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
