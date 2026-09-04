"""Consensus abstraction that reports only configured forecast sources."""

from typing import Any


def summarize_consensus(sources: list[dict[str, Any]]) -> dict[str, Any]:
    """Compare supplied source summaries without fabricating unavailable models."""
    if not sources:
        return {"source_count": 0, "consensus": "unavailable", "uncertainty": "high", "reason": "No forecast sources are configured"}
    if len(sources) == 1:
        return {"source_count": 1, "consensus": "unavailable", "uncertainty": "unavailable", "reason": "Only one forecast source is configured", "sources": sources}
    labels = [str(source.get("rain_signal", "unknown")) for source in sources]
    unique = set(labels)
    return {
        "source_count": len(sources),
        "consensus": labels[0] if len(unique) == 1 else "disagreement",
        "uncertainty": "low" if len(unique) == 1 and len(sources) > 1 else ("medium" if len(unique) == 1 else "high"),
        "reason": "Forecast sources agree" if len(unique) == 1 else "Forecast sources show disagreement",
        "sources": sources,
    }
