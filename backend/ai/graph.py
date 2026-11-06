from app.ai.nodes import PipelineState, create_pipeline


def run_full_pipeline(raw_text: str, deviation_id: int = None, existing_evidence: list = None) -> dict:
    state: PipelineState = {
        "raw_text": raw_text,
        "deviation_id": deviation_id,
        "intake": None,
        "extraction": None,
        "evidence_gap": None,
        "rca": None,
        "capa": None,
        "existing_evidence": existing_evidence or [],
        "errors": None,
        "all_completed": False
    }

    app_graph = create_pipeline()
    final_state = app_graph.invoke(state)

    return {
        "intake": final_state.get("intake"),
        "extraction": final_state.get("extraction"),
        "evidence_gap": final_state.get("evidence_gap"),
        "rca": final_state.get("rca"),
        "capa": final_state.get("capa"),
        "all_nodes_completed": final_state.get("all_completed", False),
        "errors": final_state.get("errors")
    }


def run_rca_only(extraction: dict, existing_evidence: list = None, method: str = "five_whys") -> dict:
    from app.ai.groq_client import groq_client
    from app.ai.schemas import ExtractedDeviation, RCAResult

    extraction_obj = ExtractedDeviation.model_validate(extraction)
    rca = groq_client.rca_analysis(extraction_obj, existing_evidence or [], method)
    return {"rca": rca, "errors": None}


def run_capa_only(extraction: dict, rca: dict) -> dict:
    from app.ai.groq_client import groq_client
    from app.ai.schemas import ExtractedDeviation, RCAResult, CAPAResult

    extraction_obj = ExtractedDeviation.model_validate(extraction)
    rca_obj = RCAResult.model_validate(rca)
    capa = groq_client.capa_proposal(extraction_obj, rca_obj)
    return {"capa": capa, "errors": None}