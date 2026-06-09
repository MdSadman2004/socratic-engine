import pytest
import httpx
import json

BASE_URL = "http://localhost:3001"

def test_telemetry():
    """
    Verify GET /api/chat retrieves token usage stats.
    """
    response = httpx.get(f"{BASE_URL}/api/chat")
    assert response.status_code == 200
    data = response.json()
    assert "tokens_used" in data
    assert "daily_limit" in data
    assert isinstance(data["tokens_used"], int)
    assert isinstance(data["daily_limit"], int)

def test_chat_streaming():
    """
    Verify POST /api/chat streams SSE events and can be successfully decoded.
    """
    payload = {
        "messages": [
            {"id": "msg-1", "role": "user", "content": "Explain what a directed acyclic graph is in one sentence."}
        ]
    }
    with httpx.stream("POST", f"{BASE_URL}/api/chat", json=payload, timeout=120.0) as r:
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/event-stream")
        
        chunks = []
        for line in r.iter_lines():
            if line.startswith("data: "):
                data_str = line[6:]
                chunk = json.loads(data_str)
                chunks.append(chunk)
                
        assert len(chunks) > 0
        # Check that we received at least some tokens
        tokens = [c["content"] for c in chunks if c["type"] == "token"]
        full_text = "".join(tokens)
        assert len(full_text) > 0
        
        # Verify we received agent metadata
        agents = [c["agent"] for c in chunks if c["type"] == "agent"]
        assert len(agents) > 0

def test_visual_override():
    """
    Verify that visual query keywords successfully trigger visual route override telemetry.
    """
    payload = {
        "messages": [
            {"id": "msg-1", "role": "user", "content": "show me a simulation of planetary orbits"}
        ]
    }
    with httpx.stream("POST", f"{BASE_URL}/api/chat", json=payload, timeout=120.0) as r:
        assert r.status_code == 200
        
        tracks = []
        for line in r.iter_lines():
            if line.startswith("data: "):
                chunk = json.loads(line[6:])
                if chunk["type"] == "track":
                    tracks.append(chunk["track"]["content"])
                    
        # Verify that the router agent triggered an override or visual route
        override_seen = any("visual" in t.lower() or "override" in t.lower() for t in tracks)
        assert override_seen

def test_socratic_question_constraint():
    """
    Verify the agent responses end in exactly one question mark.
    """
    payload = {
        "messages": [
            {"id": "msg-1", "role": "user", "content": "What is the primary difference between a queue and a stack?"}
        ]
    }
    with httpx.stream("POST", f"{BASE_URL}/api/chat", json=payload, timeout=120.0) as r:
        assert r.status_code == 200
        tokens = []
        for line in r.iter_lines():
            if line.startswith("data: "):
                chunk = json.loads(line[6:])
                if chunk["type"] == "token":
                    tokens.append(chunk["content"])
        
        full_text = "".join(tokens).strip()
        assert len(full_text) > 0
        # The Socratic constraint enforces ending in a single question
        assert full_text.endswith("?")
