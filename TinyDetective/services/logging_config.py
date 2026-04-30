"""Logging configuration for backend and agent activity."""

from __future__ import annotations

import logging
from pathlib import Path


LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_PATH = LOG_DIR / "tinydetective.log"


def configure_logging() -> logging.Logger:
    LOG_DIR.mkdir(exist_ok=True)
    logger = logging.getLogger("tinydetective")
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

    file_handler = logging.FileHandler(LOG_PATH, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    logger.propagate = False
    return logger
