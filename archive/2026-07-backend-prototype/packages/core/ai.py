"""AIService — single AI interface for the whole platform.

Business logic never calls an AI provider directly. It calls this interface,
and the concrete provider (Ollama / Gemini / Claude / OpenAI / disabled) is
selected by configuration only. With `AI_PROVIDER=disabled`, every call is a
no-op so the rest of the system runs unchanged. Swapping providers = env var.

This keeps the platform AI-ready without embedding vendor code in features.
"""
from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import Any

from packages.core.config import settings
from packages.core.logging import get_logger

log = get_logger("happyplace.ai")


class AIService(ABC):
    """Provider-agnostic AI interface."""

    provider: str = "base"

    @abstractmethod
    async def complete(self, prompt: str, **opts: Any) -> str:
        """Return a text completion for the given prompt."""

    @abstractmethod
    async def summarize(self, text: str, **opts: Any) -> str:
        """Return a short summary."""


class _DisabledAI(AIService):
    """No-op AI. Business logic must tolerate this gracefully."""

    provider = "disabled"

    async def complete(self, prompt: str, **opts: Any) -> str:
        log.info("AI disabled — returning empty completion")
        return ""

    async def summarize(self, text: str, **opts: Any) -> str:
        # Cheap local fallback: first 200 chars, no provider needed.
        return (text or "")[:200]


class _OllamaAI(AIService):
    provider = "ollama"

    def __init__(self, base_url: str, model: str) -> None:
        self.base_url = base_url
        self.model = model

    async def complete(self, prompt: str, **opts: Any) -> str:
        import json
        import urllib.request

        payload = json.dumps({"model": self.model, "prompt": prompt, "stream": False}).encode()
        req = urllib.request.Request(self.base_url.rstrip("/") + "/api/generate", data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read()).get("response", "")

    async def summarize(self, text: str, **opts: Any) -> str:
        return await self.complete(f"Summarize in 2 sentences:\n{text}")


class _OpenAICompatibleAI(AIService):
    """Used for Gemini (via compat), Claude, and OpenAI — all OpenAI-style APIs."""

    provider = "openai-compatible"

    def __init__(self, base_url: str, api_key: str, model: str) -> None:
        self.base_url = base_url
        self.api_key = api_key
        self.model = model

    async def complete(self, prompt: str, **opts: Any) -> str:
        import json
        import urllib.request

        payload = json.dumps({"model": self.model, "messages": [{"role": "user", "content": prompt}]}).encode()
        req = urllib.request.Request(
            self.base_url.rstrip("/") + "/chat/completions",
            data=payload,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"},
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())["choices"][0]["message"]["content"]

    async def summarize(self, text: str, **opts: Any) -> str:
        return await self.complete(f"Summarize in 2 sentences:\n{text}")


def get_ai_service() -> AIService:
    """Factory: pick provider from configuration. No code changes per provider."""
    provider = (os.getenv("AI_PROVIDER") or "disabled").lower()
    if provider == "disabled":
        return _DisabledAI()
    if provider == "ollama":
        return _OllamaAI(
            os.getenv("AI_OLLAMA_URL", "http://localhost:11434"),
            os.getenv("AI_OLLAMA_MODEL", "llama3"),
        )
    if provider in ("openai", "claude", "gemini"):
        urls = {
            "openai": "https://api.openai.com/v1",
            "claude": "https://api.anthropic.com/v1",
            "gemini": "https://generativelanguage.googleapis.com/v1beta/openai",
        }
        return _OpenAICompatibleAI(
            urls[provider],
            os.getenv("AI_API_KEY", ""),
            os.getenv("AI_MODEL", "gpt-4o-mini"),
        )
    log.warning("unknown AI provider, using disabled", extra={"ctx": {"provider": provider}})
    return _DisabledAI()
