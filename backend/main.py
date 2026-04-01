import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import Base, engine
from chore_templates import get_templates


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pass  # Tables may already exist or another worker is creating them
    yield
    await engine.dispose()


app = FastAPI(
    title="ChoreMax API",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting (in-memory, same pattern as ProLog)
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 20
RATE_WINDOW = 60


@app.middleware("http")
async def rate_limit_auth(request: Request, call_next):
    if request.url.path.startswith("/api/auth/") and request.method == "POST":
        ip = request.client.host if request.client else "unknown"
        now = time.time()
        _rate_store[ip] = [t for t in _rate_store[ip] if now - t < RATE_WINDOW]
        if len(_rate_store[ip]) >= RATE_LIMIT:
            return Response(content='{"detail":"Too many requests"}', status_code=429, media_type="application/json")
        _rate_store[ip].append(now)
    return await call_next(request)


# Security headers
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


# Routers
from routers.auth import router as auth_router
from routers.children import router as children_router
from routers.chores import router as chores_router
from routers.completions import router as completions_router
from routers.tokens import router as tokens_router
from routers.goals import router as goals_router
from routers.dashboard import router as dashboard_router
from routers.settings import router as settings_router
from routers.meals import router as meals_router
from routers.meal_plans import router as meal_plans_router
from routers.shopping_list import router as shopping_list_router

app.include_router(auth_router)
app.include_router(children_router)
app.include_router(chores_router)
app.include_router(completions_router)
app.include_router(tokens_router)
app.include_router(goals_router)
app.include_router(dashboard_router)
app.include_router(settings_router)
app.include_router(meals_router)
app.include_router(meal_plans_router)
app.include_router(shopping_list_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "env": settings.NODE_ENV}


@app.get("/api/chore-templates")
async def chore_templates():
    return get_templates()
