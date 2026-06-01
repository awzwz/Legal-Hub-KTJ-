"""Наблюдаемость: JSON-логи, Prometheus /metrics, OpenTelemetry (опционально OTLP)."""

from __future__ import annotations

import logging
import os
import time
import uuid
from typing import TYPE_CHECKING

from fastapi import FastAPI, Request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

if TYPE_CHECKING:
    pass

REQUEST_COUNT = Counter(
    "legalhub_http_requests_total",
    "HTTP requests",
    ("method", "path_template", "status"),
)
REQUEST_LATENCY = Histogram(
    "legalhub_http_request_duration_seconds",
    "HTTP request latency",
    ("method", "path_template"),
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)


def configure_structured_logging() -> None:
    if os.getenv("LOG_JSON", "").lower() not in ("1", "true", "yes"):
        return
    try:
        from pythonjsonlogger import jsonlogger
    except ImportError:
        return
    handler = logging.StreamHandler()
    fmt = jsonlogger.JsonFormatter("%(timestamp)s %(level)s %(name)s %(message)s")
    handler.setFormatter(fmt)
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)


def setup_prometheus_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def prometheus_middleware(request: Request, call_next):
        method = request.method
        started_at = time.perf_counter()
        response = await call_next(request)
        route = request.scope.get("route")
        path_template = getattr(route, "path", request.url.path) if route else request.url.path
        REQUEST_LATENCY.labels(method, path_template).observe(time.perf_counter() - started_at)
        status = str(response.status_code)
        REQUEST_COUNT.labels(method, path_template, status).inc()
        return response

    @app.get("/metrics", include_in_schema=False)
    async def metrics():
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


def setup_opentelemetry(app: FastAPI, service_name: str) -> None:
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "").strip()
    if not endpoint:
        return
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=os.getenv("OTEL_EXPORTER_OTLP_INSECURE", "true").lower() == "true")
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(app)
    try:
        from app.db.session import engine

        SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
    except Exception:
        logging.getLogger(__name__).warning("SQLAlchemy OTel instrumentation skipped", exc_info=True)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = rid
        response = await call_next(request)
        response.headers["X-Request-Id"] = rid
        return response


def attach_observability(app: FastAPI, *, service_name: str) -> None:
    configure_structured_logging()
    app.add_middleware(RequestIdMiddleware)
    setup_prometheus_middleware(app)
    setup_opentelemetry(app, service_name=service_name)
