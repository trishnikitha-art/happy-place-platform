"""Admin / Operations dashboard (single-page, no build step).

Served as static HTML + vanilla JS. It talks to /ops/api (see apps/api/ops.py).
Office staff see friendly cards — never JSON, never Google Sheets internals.

Cards:
  * Integration health (Google / Drive / Calendar / Mail / Database)
  * Queue (pending/running/completed/dead) with Retry + Cancel
  * Dead-letter queue with a single Retry button
  * Business event timeline
  * Recent errors / workflow logs
  * Config (editable values)
  * Metrics (leads today, emails sent, ...)
  * Replay controls (rerun a lead/project idempotently)
"""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse

HTML = (Path(__file__).parent / "admin.html").read_text(encoding="utf-8")

app = FastAPI(title="Operations", docs_url=None)

app.add_route("/", lambda request: HTMLResponse(HTML), methods=["GET"])
