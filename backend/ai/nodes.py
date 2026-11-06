from typing import TypedDict, Optional, List, Dict, Any
from app.ai.schemas import (
    IntakeResult, ExtractedDeviation, EvidenceGap, RCAResult, CAPAResult, AIProcessResult
)


class PipelineState(TypedDict):
    raw_text: str
    deviation_id: Optional[int]
    intake: Optional[IntakeResult]
    extraction: Optional[ExtractedDeviation]
    evidence_gap: Optional[EvidenceGap]
    rca: Optional[RCAResult]
    capa: Optional[CAPAResult]
    existing_evidence: Optional[List[Dict[str, Any]]]
    errors: Optional[List[str]]
    all_completed: bool


def intake_node(state: PipelineState) -> PipelineState:
    raw_text = state.get("raw_text", "")
    text_length = len(raw_text)
    text_preview = raw_text[:200] + "..." if len(raw_text) > 200 else raw_text

    is_garbled = any(indicator in raw_text.lower() for indicator in ["???", "xxx", "unreadable"])
    text_type = "email" if "@" in raw_text and "." in raw_text else "document"
    if "batch" in raw_text.lower() and "record" in raw_text.lower():
        text_type = "batch record"
    elif "pdf" in raw_text.lower():
        text_type = "pdf extract"

    state["intake"] = IntakeResult(
        text_length=text_length,
        text_preview=text_preview,
        text_type=text_type,
        is_garbled=is_garbled,
        language_detected="en"
    )
    return state


def extraction_node(state: PipelineState) -> PipelineState:
    from app.ai.groq_client import groq_client

    raw_text = state.get("raw_text", "")
    try:
        extraction = groq_client.extraction(raw_text)
        state["extraction"] = extraction
    except Exception as e:
        state["errors"] = state.get("errors", []) + [f"Extraction failed: {str(e)}"]
    return state


def evidence_gap_node(state: PipelineState) -> PipelineState:
    from app.ai.groq_client import groq_client

    extraction = state.get("extraction")
    existing_evidence = state.get("existing_evidence", [])

    if not extraction:
        state["errors"] = state.get("errors", []) + ["Cannot run evidence gap analysis: no extraction"]
        return state

    try:
        evidence_gap = groq_client.evidence_gap(extraction, existing_evidence)
        state["evidence_gap"] = evidence_gap
    except Exception as e:
        state["errors"] = state.get("errors", []) + [f"Evidence gap analysis failed: {str(e)}"]
    return state


def rca_node(state: PipelineState) -> PipelineState:
    from app.ai.groq_client import groq_client

    extraction = state.get("extraction")
    existing_evidence = state.get("existing_evidence", [])

    if not extraction:
        state["errors"] = state.get("errors", []) + ["Cannot run RCA: no extraction"]
        return state

    method = "five_whys"
    if extraction.severity == "Critical":
        method = "fishbone"

    try:
        rca = groq_client.rca_analysis(extraction, existing_evidence, method)
        state["rca"] = rca
    except Exception as e:
        state["errors"] = state.get("errors", []) + [f"RCA analysis failed: {str(e)}"]
    return state


def capa_node(state: PipelineState) -> PipelineState:
    from app.ai.groq_client import groq_client

    extraction = state.get("extraction")
    rca = state.get("rca")

    if not extraction or not rca:
        state["errors"] = state.get("errors", []) + ["Cannot propose CAPA: missing extraction or RCA"]
        return state

    try:
        capa = groq_client.capa_proposal(extraction, rca)
        state["capa"] = capa
    except Exception as e:
        state["errors"] = state.get("errors", []) + [f"CAPA proposal failed: {str(e)}"]
    return state


def complete_pipeline(state: PipelineState) -> PipelineState:
    state["all_completed"] = True
    return state


def create_pipeline():
    from langgraph.graph import StateGraph, END

    workflow = StateGraph(PipelineState)

    workflow.add_node("intake", intake_node)
    workflow.add_node("extraction", extraction_node)
    workflow.add_node("evidence_gap", evidence_gap_node)
    workflow.add_node("rca", rca_node)
    workflow.add_node("capa", capa_node)
    workflow.add_node("complete", complete_pipeline)

    workflow.set_entry_point("intake")
    workflow.add_edge("intake", "extraction")
    workflow.add_edge("extraction", "evidence_gap")
    workflow.add_edge("evidence_gap", "rca")
    workflow.add_edge("rca", "capa")
    workflow.add_edge("capa", "complete")
    workflow.add_edge("complete", END)

    return workflow.compile()