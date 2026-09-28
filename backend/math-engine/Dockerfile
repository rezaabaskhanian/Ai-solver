# REGISTRY lets the aramina server pull base images through Arvan's
# Docker Hub mirror (DOCKER_REGISTRY=docker.arvancloud.ir in .env) —
# direct Docker Hub pulls from there crawl at a few KB/s.
ARG REGISTRY=docker.io
FROM ${REGISTRY}/library/python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
