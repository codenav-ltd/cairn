#!/bin/sh
# Dump the database of the Cairn instance this script sits next to.
#
#   CAIRN_BACKUP_DIR   where dumps go (default ~/backups/<compose project>)
#   CAIRN_BACKUP_DAYS  how many days of dumps to keep (default 14)
#
# Dumps use pg_dump's custom format, which is compressed; restore with
#   docker compose exec -T postgres pg_restore -U cairn -d cairn --clean < FILE
set -eu
umask 077

cd "$(dirname "$0")"
project=$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' .env)
project=${project:-cairn}
dest=${CAIRN_BACKUP_DIR:-$HOME/backups/$project}
keep=${CAIRN_BACKUP_DAYS:-14}

mkdir -p "$dest"
file="$dest/$project-$(date -u +%Y%m%dT%H%M%SZ).dump"
trap 'rm -f "$file.partial"' EXIT

docker compose exec -T postgres pg_dump -U cairn -d cairn --format=custom < /dev/null > "$file.partial"
mv "$file.partial" "$file"
find "$dest" -name "$project-*.dump" -mtime +"$((keep - 1))" -delete

echo "$(date -u +%FT%TZ) $file $(du -h "$file" | cut -f1)"
