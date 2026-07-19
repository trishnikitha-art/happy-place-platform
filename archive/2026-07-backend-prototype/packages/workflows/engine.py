"""Workflow engine — compose reusable, independently-testable steps.

A Workflow is an ordered list of Step objects. Each Step has a single
`run(context)` method that mutates/reads a shared context dict. Steps are
pure units of work: validate, persist, create folder, queue email, etc.
This makes every workflow transparent and unit-testable in isolation.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from packages.core.logging import log_workflow


@dataclass
class StepResult:
    name: str
    ok: bool
    data: dict = field(default_factory=dict)
    error: str | None = None


class Step:
    """Base step. Subclass and implement `run`."""

    name: str = "step"

    def run(self, ctx: dict[str, Any]) -> StepResult:
        raise NotImplementedError


# A step can also be a plain async/sync callable for lightweight steps.
StepFn = Callable[[dict[str, Any]], StepResult]


class Workflow:
    """An ordered pipeline of steps executed against a shared context."""

    def __init__(self, name: str, steps: list[Step]) -> None:
        self.name = name
        self.steps = steps

    async def run(self, ctx: dict[str, Any]) -> dict[str, Any]:
        log_workflow.info("workflow start", extra={"ctx": {"workflow": self.name}})
        ctx["_workflow"] = self.name
        ctx["_results"] = []
        for step in self.steps:
            try:
                result = step.run(ctx)
                # support async step functions
                if hasattr(result, "__await__"):
                    result = await result
                ctx["_results"].append(result)
                if not result.ok:
                    log_workflow.warning(
                        "workflow step failed",
                        extra={"ctx": {"workflow": self.name, "step": result.name, "error": result.error}},
                    )
                    break
            except Exception as exc:
                log_workflow.error(
                    "workflow step raised",
                    extra={"ctx": {"workflow": self.name, "step": getattr(step, "name", repr(step)), "error": str(exc)}},
                )
                ctx["_results"].append(StepResult(getattr(step, "name", repr(step)), False, error=str(exc)))
                break
        log_workflow.info("workflow end", extra={"ctx": {"workflow": self.name, "ok": all(r.ok for r in ctx["_results"])}})
        return ctx
