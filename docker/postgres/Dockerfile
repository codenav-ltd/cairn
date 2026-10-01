FROM postgres:18-trixie

# pgvector comes from the PGDG repository the base image already configures;
# PGroonga from Groonga's own repository.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates wget; \
    wget -q -O /tmp/groonga-apt-source.deb \
      https://packages.groonga.org/debian/groonga-apt-source-latest-trixie.deb; \
    apt-get install -y --no-install-recommends /tmp/groonga-apt-source.deb; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      postgresql-18-pgvector \
      postgresql-18-pgdg-pgroonga; \
    apt-get purge -y wget; \
    apt-get autoremove -y; \
    rm -rf /var/lib/apt/lists/* /tmp/*.deb
