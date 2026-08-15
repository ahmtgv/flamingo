#!/bin/sh
# Ежедневный дамп базы точки встречи.
#
# Зачем отдельно от копии кабинета: кабинет живёт на машине преподавателя и копируется сам
# (Р5.5). На сервере лежит другое — учётки, расписание, зеркало ученика. Если сервер умрёт,
# восстанавливать будет нечего, а там работы и оценки живых детей.
#
# Хранит семь дней и удаляет старше. Ставится в cron — см. LAUNCH_RUNBOOK шаг 13.
set -eu

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/backups"
STAMP="$(date +%Y-%m-%d_%H%M)"

mkdir -p "$OUT"

docker compose -f "$DIR/docker-compose.prod.yml" --env-file "$DIR/../../.env.production" \
  exec -T postgres pg_dumpall -U "${POSTGRES_USER:-flamingo}" \
  | gzip > "$OUT/flamingo_$STAMP.sql.gz"

# Семь дней — компромисс: недели хватает, чтобы заметить пропажу, и диск не заполняется.
find "$OUT" -name 'flamingo_*.sql.gz' -mtime +7 -delete

echo "$(date '+%F %T')  дамп готов: $OUT/flamingo_$STAMP.sql.gz  ($(du -h "$OUT/flamingo_$STAMP.sql.gz" | cut -f1))"
