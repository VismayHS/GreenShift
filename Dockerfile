# GreenShift pipeline image: tests -> backtest -> audit -> report -> site data -> results notebook.
# The repository is mounted at /app by docker-compose.yml, so every output lands in your checkout.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    MPLBACKEND=Agg \
    MPLCONFIGDIR=/tmp/matplotlib \
    HOME=/tmp

# git records the commit in every output (optional: outputs say null without it)
RUN apt-get update \
 && apt-get install -y --no-install-recommends git \
 && rm -rf /var/lib/apt/lists/* \
 && git config --system --add safe.directory /app

WORKDIR /app
COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements-dev.txt

CMD ["python", "scripts/run_all.py", "--skip-measure", "--offline"]
