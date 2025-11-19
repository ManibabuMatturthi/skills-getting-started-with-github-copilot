import copy

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    """Restore in-memory activities after each test to avoid cross-test pollution."""
    snapshot = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(copy.deepcopy(snapshot))


def test_get_activities_returns_dict():
    client = TestClient(app)
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_adds_participant():
    client = TestClient(app)
    email = "pytest.user@example.com"

    # Ensure not already present
    assert email not in activities["Chess Club"]["participants"]

    r = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert r.status_code == 200
    assert email in activities["Chess Club"]["participants"]
    assert "Signed up" in r.json().get("message", "")


def test_signup_invalid_activity_returns_404():
    client = TestClient(app)
    r = client.post("/activities/NoSuchActivity/signup?email=a@b.com")
    assert r.status_code == 404


def test_unregister_removes_participant_and_handles_missing():
    client = TestClient(app)
    email = "pytest.remove@example.com"

    # Add first, then remove
    activities["Chess Club"]["participants"].append(email)
    assert email in activities["Chess Club"]["participants"]

    r = client.delete(f"/activities/Chess%20Club/participants?email={email}")
    assert r.status_code == 200
    assert email not in activities["Chess Club"]["participants"]

    # Removing again should return 404
    r2 = client.delete(f"/activities/Chess%20Club/participants?email={email}")
    assert r2.status_code == 404


def test_unregister_invalid_activity_returns_404():
    client = TestClient(app)
    r = client.delete("/activities/NoSuchActivity/participants?email=a@b.com")
    assert r.status_code == 404
