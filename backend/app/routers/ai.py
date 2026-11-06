from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.ai.graph import run_full_pipeline, run_rca_only, run_capa_only

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ProcessRequest(BaseModel):
    deviation_id: Optional[int] = None
    raw_text: str
    existing_evidence: Optional[List[Dict[str, Any]]] = None


class ProcessResponse(BaseModel):
    intake: Dict[str, Any]
    extraction: Dict[str, Any]
    evidence_gap: Dict[str, Any]
    rca: Optional[Dict[str, Any]] = None
    capa: Optional[Dict[str, Any]] = None
    all_nodes_completed: bool
    errors: Optional[List[str]] = None


class RCARequest(BaseModel):
    extraction: Dict[str, Any]
    existing_evidence: Optional[List[Dict[str, Any]]] = None
    method: str = "five_whys"


class RCAResponse(BaseModel):
    rca: Dict[str, Any]
    errors: Optional[List[str]] = None


class CAPARequest(BaseModel):
    extraction: Dict[str, Any]
    rca: Dict[str, Any]


class CAPAResponse(BaseModel):
    capa: Dict[str, Any]
    errors: Optional[List[str]] = None


@router.post("/process", response_model=ProcessResponse)
def process_deviation(request: ProcessRequest):
    if not request.raw_text or len(request.raw_text.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="raw_text must be at least 10 characters"
        )

    result = run_full_pipeline(
        raw_text=request.raw_text,
        deviation_id=request.deviation_id,
        existing_evidence=request.existing_evidence
    )

    return ProcessResponse(
        intake=result["intake"].model_dump() if result["intake"] else None,
        extraction=result["extraction"].model_dump() if result["extraction"] else None,
        evidence_gap=result["evidence_gap"].model_dump() if result["evidence_gap"] else None,
        rca=result["rca"].model_dump() if result["rca"] else None,
        capa=result["capa"].model_dump() if result["capa"] else None,
        all_nodes_completed=result["all_nodes_completed"],
        errors=result["errors"]
    )


@router.post("/{deviation_id}/rca", response_model=RCAResponse)
def run_rca_analysis(deviation_id: int, request: RCARequest):
    if not request.extraction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="extraction data is required"
        )

    result = run_rca_only(
        extraction=request.extraction,
        existing_evidence=request.existing_evidence,
        method=request.method
    )

    return RCAResponse(
        rca=result["rca"].model_dump() if result["rca"] else None,
        errors=result["errors"]
    )


@router.post("/{deviation_id}/capa", response_model=CAPAResponse)
def run_capa_proposal(deviation_id: int, request: CAPARequest):
    if not request.extraction or not request.rca:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both extraction and rca data are required"
        )

    result = run_capa_only(
        extraction=request.extraction,
        rca=request.rca
    )

    return CAPAResponse(
        capa=result["capa"].model_dump() if result["capa"] else None,
        errors=result["errors"]
    )