# ══════════════════════════════════════════════════════════════════════════════
#  NeuroLearn AI – ML Service Dockerfile
#  Python 3.11-slim, libgomp1, non-root user appuser (port 8000)
# ══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

# Install system dependencies: libgomp1 for OpenMP (XGBoost/SHAP) and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user appuser
RUN groupadd -r appuser && useradd -r -g appuser -m -d /home/appuser appuser

WORKDIR /app

# Install Python requirements
COPY ml-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy ml-service files and data
COPY ml-service /app
COPY data /app/data

# Set ownership to appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    MODEL_PATH=models/model_v1.joblib \
    GRAPH_PATH=data/graph.json

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/ml/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
