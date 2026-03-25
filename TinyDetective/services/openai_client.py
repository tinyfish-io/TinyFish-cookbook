"""Minimal OpenAI Responses API client for structured JSON outputs."""

from __future__ import annotations

import asyncio
import json
from typing import Any
from urllib import error, request

from services.settings import settings


class OpenAIError(RuntimeError):
    """Raised when the OpenAI API returns an error or an unusable payload."""


class OpenAIClient:
    """Small raw HTTP client for structured OpenAI responses."""

    def __init__(self) -> None:
        self.base_url = settings.openai_base_url.rstrip("/")
        self.api_key = settings.openai_api_key

    async def run_json(
        self,
        *,
        model: str,
        instructions: str,
        input_text: str,
        schema_name: str,
        schema: dict[str, Any],
        max_output_tokens: int = 700,
    ) -> dict[str, Any]:
        if not self.api_key:
            raise OpenAIError("OPENAI_API_KEY is not configured.")

        payload = {
            "model": model,
            "instructions": instructions,
            "input": input_text,
            "max_output_tokens": max_output_tokens,
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": schema_name,
                    "strict": True,
                    "schema": schema,
                }
            },
        }
        response = await asyncio.to_thread(
            self._request_json,
            "POST",
            f"{self.base_url}/v1/responses",
            payload,
        )
        return self._extract_json_object(response)

    def _request_json(self, method: str, url: str, payload: dict[str, Any]) -> dict[str, Any]:
        req = request.Request(
            url=url,
            data=json.dumps(payload).encode("utf-8"),
            method=method,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
        )
        try:
            with request.urlopen(req, timeout=settings.openai_http_timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise OpenAIError(f"OpenAI HTTP {exc.code}: {detail}") from exc
        except error.URLError as exc:
            raise OpenAIError(f"Failed to reach OpenAI: {exc.reason}") from exc
        except TimeoutError as exc:
            raise OpenAIError("Timed out while waiting for OpenAI to respond.") from exc

    @staticmethod
    def _extract_json_object(response: dict[str, Any]) -> dict[str, Any]:
        direct_text = response.get("output_text")
        if isinstance(direct_text, str) and direct_text.strip():
            return OpenAIClient._parse_json_text(direct_text)

        for output_item in response.get("output", []):
            if not isinstance(output_item, dict):
                continue
            for content_item in output_item.get("content", []):
                if not isinstance(content_item, dict):
                    continue
                text_value = content_item.get("text")
                if isinstance(text_value, str) and text_value.strip():
                    return OpenAIClient._parse_json_text(text_value)
                if isinstance(text_value, dict) and isinstance(text_value.get("value"), str):
                    return OpenAIClient._parse_json_text(text_value["value"])
                if content_item.get("type") in {"output_text", "text"} and isinstance(
                    content_item.get("value"), str
                ):
                    return OpenAIClient._parse_json_text(content_item["value"])

        raise OpenAIError(f"OpenAI did not return parseable structured JSON: {response}")

    @staticmethod
    def _parse_json_text(text: str) -> dict[str, Any]:
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as exc:
            raise OpenAIError(f"OpenAI output was not valid JSON: {text}") from exc
        if not isinstance(parsed, dict):
            raise OpenAIError(f"OpenAI output JSON was not an object: {parsed!r}")
        return parsed
