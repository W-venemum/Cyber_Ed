"""Shared pytest fixtures for the Assessment Auditor backend tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.data_store import DataStore, reset_store
from app.main import app


@pytest.fixture()
def store() -> DataStore:
    """A fresh DataStore rebuilt from disk (clears any in-memory repairs)."""
    return reset_store()


@pytest.fixture()
def client(store: DataStore) -> TestClient:
    """FastAPI TestClient over a freshly reset store."""
    return TestClient(app)
