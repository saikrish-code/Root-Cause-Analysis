"""
ai.agent — kept for backward compatibility.

The actual pipeline logic lives in:
  - ai.groq_client   (Groq SDK wrapper)
  - ai.schemas        (Pydantic schemas)
  - ai.prompts        (system/user prompts)
  - ai.nodes          (pipeline node functions)
  - ai.graph          (LangGraph graph builders)
  - ai.router         (FastAPI endpoints)
"""

from ai.graph import build_full_graph, build_rca_only_graph, build_capa_only_graph  # noqa: F401

__all__ = ["build_full_graph", "build_rca_only_graph", "build_capa_only_graph"]
