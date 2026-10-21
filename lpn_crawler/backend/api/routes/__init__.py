# -*- coding: utf-8 -*-
from lpn_crawler.backend.api.routes.jobs import router as jobs_router
from lpn_crawler.backend.api.routes.containers import router as containers_router
from lpn_crawler.backend.api.routes.items import router as items_router
from lpn_crawler.backend.api.routes.logs import router as logs_router
from lpn_crawler.backend.api.routes.stats import router as stats_router
from lpn_crawler.backend.api.routes.images import router as images_router
from lpn_crawler.backend.api.routes.export import router as export_router
from lpn_crawler.backend.api.routes.webhook import router as webhook_router

__all__ = [
    "jobs_router",
    "containers_router",
    "items_router",
    "logs_router",
    "stats_router",
    "images_router",
    "export_router",
    "webhook_router",
]
