"""TinyFish-compatible workflow runtime abstraction."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import TypeVar


T = TypeVar("T")


class TinyFishRuntime:
    """Small async task runner with a TinyFish-friendly interface."""

    async def run_agent(self, fn: Callable[[], Awaitable[T]]) -> T:
        return await fn()
