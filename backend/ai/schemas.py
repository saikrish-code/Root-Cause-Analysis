from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class IntakeResult(BaseModel):
    text_length: int
    text_preview: str = Field(..., max_length=200)
    text_type: str
    is_garbled: bool = False
    language_detected: str = "en"


class ExtractedDeviation(BaseModel):
    product_name: Optional[str] = Field(None, description="Product name mentioned in text, or null if not found")
    batch_lot_number: Optional[str] = Field(None, description="Batch or lot number, or null if not found")
    manufacturing_date: Optional[date] = Field(None, description="Date of manufacturing if mentioned, or null")
    detected_date: Optional[date] = Field(None, description="Date the issue was detected/first noticed, or null")
    site_block: Optional[str] = Field(None, description="One of: Manufacturing, Packaging, QC Lab, Warehouse, Utilities, or null")
    severity: Optional[str] = Field(None, description="One of: Critical, Major, Minor, or null if unclear")
    title: Optional[str] = Field(None, description="Concise title summarizing the deviation")
    description: Optional[str] = Field(None, description="Full description extracted from source text")
    raw_text: str = Field(..., description="Original source text for reference")
    extraction_confidence: float = Field(..., ge=0, le=1, description="Confidence score for extraction quality")
    missing_fields: List[str] = Field(default_factory=list, description="List of fields that could not be extracted")


class EvidenceGap(BaseModel):
    missing_information: List[str] = Field(default_factory=list, description="Critical info missing from source")
    suggested_evidence_types: List[str] = Field(default_factory=list, description="Types of evidence that would help")
    questions_to_investigate: List[str] = Field(default_factory=list, description="Questions to answer during investigation")
    risk_flags: List[str] = Field(default_factory=list, description="Potential compliance or quality risks flagged by AI")


class RCAResult(BaseModel):
    method_used: str = Field(..., description="five_whys or fishbone")
    root_cause: str = Field(..., description="Primary root cause identified")
    contributing_factors: List[str] = Field(default_factory=list, description="Secondary contributing factors")
    confidence_score: float = Field(..., ge=0, le=1, description="Confidence in root cause accuracy")
    evidence_support_notes: str = Field(..., description="Explanation of what evidence supports this conclusion")
    limitations: str = Field(..., description="Any limitations or assumptions in the analysis")


class ProposedCAPA(BaseModel):
    action_type: str = Field(..., description="Corrective or Preventive")
    description: str = Field(..., description="Specific action to take")
    rationale: str = Field(..., description="Why this action addresses the root cause")
    owner: Optional[str] = Field(None, description="Suggested owner role or department")
    priority: str = Field(..., description="High, Medium, or Low based on severity")
    estimated_effort: Optional[str] = Field(None, description="Rough effort estimate")


class CAPAResult(BaseModel):
    proposed_capas: List[ProposedCAPA] = Field(default_factory=list, description="All proposed CAPA actions")
    immediate_actions: List[str] = Field(default_factory=list, description="Urgent actions if severity is Critical")
    long_term_improvements: List[str] = Field(default_factory=list, description="Systemic improvements suggested")


class AIProcessResult(BaseModel):
    intake: IntakeResult
    extraction: ExtractedDeviation
    evidence_gap: EvidenceGap
    rca: Optional[RCAResult] = None
    capa: Optional[CAPAResult] = None
    all_nodes_completed: bool = False