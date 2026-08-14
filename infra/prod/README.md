# infra/prod — точка встречи

Минимальный контур для пилота: Postgres · Redis · Django ASGI · Caddy с автоматическим TLS.
Ретрансляция (TURN) вынесена в Cloudflare — см. `.env.production.example`.

**Пошаговый порядок развёртывания — `docs/handoff/DEPLOY_RUNBOOK.md`.**
Здесь только файлы; там — что нажимать и в каком порядке.

Что сознательно НЕ здесь: coturn (отдали Cloudflare), MinIO (файлы у преподавателя),
LiveKit (медиа с машины преподавателя), Celery (async отложен).
