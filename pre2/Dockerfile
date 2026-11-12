FROM nginx:stable-alpine
ARG VCS_REF=unknown
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY dist/ /usr/share/nginx/html/
# A deployed image identifies its own source, independent of mutable tags.
RUN case "$VCS_REF" in *[!0-9a-f]*|'') test "$VCS_REF" = unknown ;; *) test "${#VCS_REF}" -eq 40 ;; esac \
    && if [ "$VCS_REF" = unknown ]; then printf '{"commit":null}\n'; else printf '{"commit":"%s"}\n' "$VCS_REF"; fi > /usr/share/nginx/html/build.json
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
