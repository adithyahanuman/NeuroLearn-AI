"""
ml-service/app/main.py

Main FastAPI Application for NeuroLearn AI ML Service.
Includes lifespan artifact loading, request ID tracking middleware,
and security enforcement.
"""

from contextlib import asynccontextmanager
import os
import time
import uuid
import logging
from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.engine import get_engine, MLServiceEngine
from app.routers.ml import router as ml_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("ml-service")


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = req_id

        t0 = time.perf_counter()
        try:
            response: Response = await call_next(request)
        except Exception as exc:
            duration_ms = (time.perf_counter() - t0) * 1000.0
            logger.error(
                f"[{req_id}] {request.method} {request.url.path} - 500 Internal Server Error in {duration_ms:.2f}ms: {exc}",
                exc_info=True,
            )
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"error": "Internal Server Error", "code": "INTERNAL_SERVER_ERROR", "detail": str(exc)},
                headers={"X-Request-ID": req_id},
            )

        duration_ms = (time.perf_counter() - t0) * 1000.0
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"

        logger.info(
            f"[{req_id}] {request.method} {request.url.path} -> {response.status_code} in {duration_ms:.2f}ms"
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Preloads KnowledgeGraph, model_v1 artifact, calibrator, and SHAP TreeExplainer.
    Executes startup guards refusing to start if features or graph hash do not match.
    """
    logger.info("Initializing ML Service engine and preloading artifacts...")
    try:
        engine = get_engine()
        app.state.engine = engine
        logger.info(
            f"ML Service started successfully. Model Version: {engine.model_version}, "
            f"Concepts: {len(engine.graph_service.nodes_by_id)}, "
            f"Graph Hash: {engine.graph_hash[:12]}..."
        )
    except Exception as exc:
        logger.critical(f"FATAL: Startup guard validation failed: {exc}")
        raise exc

    yield

    logger.info("ML Service shutting down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="NeuroLearn AI – ML Service",
        description="Machine Learning, Digital Learning Twin, and SHAP Explainability Service for NeuroLearn AI.",
        version="0.4.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Add middlewares
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include ML router
    app.include_router(ml_router)

    @app.get("/", include_in_schema=False)
    def root():
        return {
            "name": "NeuroLearn AI ML Service",
            "version": "0.4.0",
            "docs": "/docs",
            "health": "/ml/health",
        }

    return app


app = create_app()
