# Flamingo backend — Python 3.12 / Django 5 / Strawberry on ASGI (uvicorn).
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System deps: libpq for psycopg, build tools for any wheels that need them.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first for better layer caching.
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

# ASGI server (HTTP now; WebSocket/Channels added with the realtime module).
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000"]
