from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class SiteBlock(str, Enum):
    Manufacturing = "Manufacturing"
    Packaging = "Packaging"
    QC_Lab = "QC Lab"
    Warehouse = "Warehouse"
    Utilities = "Utilities"

class Severity(str, Enum):
    Critical = "Critical"
    Major = "Major"
    Minor = "Minor"

class DeviationStatus(str, Enum):
    Open = "Open"
    Under_Investigation = "Under Investigation"
    RCA_Complete = "RCA Complete"
    CAPA_Assigned = "CAPA Assigned"
    Closed = "Closed"

class RCAMethod(str, Enum):
    five_whys = "five_whys"
    fishbone = "fishbone"

class RCAStatus(str, Enum):
    In_Progress = "In Progress"
    Completed = "Completed"
    Rejected = "Rejected"

class CapaStatus(str, Enum):
    Proposed = "Proposed"
    Approved = "Approved"
    In_Progress = "In Progress"
    Completed = "Completed"

class CapaActionType(str, Enum):
    Corrective = "Corrective"
    Preventive = "Preventive"

class AuditSource(str, Enum):
    ai = "ai"
    user = "user"


class FiveWhysStepBase(BaseModel):
    step_number: int
    why_question: Optional[str] = None
    answer: str
    is_ai_suggested: bool = False
    user_edited: bool = False

class FiveWhysStepCreate(FiveWhysStepBase):
    pass

class FiveWhysStepUpdate(BaseModel):
    step_number: Optional[int] = None
    why_question: Optional[str] = None
    answer: Optional[str] = None
    is_ai_suggested: Optional[bool] = None
    user_edited: Optional[bool] = None

class FiveWhysStepResponse(FiveWhysStepBase):
    id: int
    rca_investigation_id: int

    model_config = ConfigDict(from_attributes=True)


class FishboneCauseBase(BaseModel):
    category: str
    cause_text: str
    is_ai_suggested: bool = False
    user_edited: bool = False

class FishboneCauseCreate(FishboneCauseBase):
    pass

class FishboneCauseUpdate(BaseModel):
    category: Optional[str] = None
    cause_text: Optional[str] = None
    is_ai_suggested: Optional[bool] = None
    user_edited: Optional[bool] = None

class FishboneCauseResponse(FishboneCauseBase):
    id: int
    rca_investigation_id: int

    model_config = ConfigDict(from_attributes=True)

class RootCauseProposalBase(BaseModel):
    cause_text: str
    ai_rationale: str
    is_primary: bool = False
    confidence_score: int
    supporting_evidence_ids: Optional[str] = None
    status: str = "proposed"
    user_edited: bool = False

class RootCauseProposalCreate(RootCauseProposalBase):
    pass

class RootCauseProposalUpdate(BaseModel):
    cause_text: Optional[str] = None
    ai_rationale: Optional[str] = None
    is_primary: Optional[bool] = None
    confidence_score: Optional[int] = None
    supporting_evidence_ids: Optional[str] = None
    status: Optional[str] = None
    user_edited: Optional[bool] = None

class RootCauseProposalResponse(RootCauseProposalBase):
    id: int
    rca_investigation_id: int

    model_config = ConfigDict(from_attributes=True)


class RCAInvestigationBase(BaseModel):
    deviation_id: int
    method: RCAMethod
    status: RCAStatus = RCAStatus.In_Progress
    ai_generated: bool = False
    reviewed_by_user: bool = False
    confirmed_root_cause: Optional[str] = None
    confidence_notes: Optional[str] = None

class RCAInvestigationCreate(RCAInvestigationBase):
    five_whys_steps: Optional[List[FiveWhysStepCreate]] = None
    fishbone_causes: Optional[List[FishboneCauseCreate]] = None
    root_cause_proposals: Optional[List[RootCauseProposalCreate]] = None

class RCAInvestigationUpdate(BaseModel):
    method: Optional[RCAMethod] = None
    status: Optional[RCAStatus] = None
    ai_generated: Optional[bool] = None
    reviewed_by_user: Optional[bool] = None
    confirmed_root_cause: Optional[str] = None
    confidence_notes: Optional[str] = None

class RCAInvestigationResponse(RCAInvestigationBase):
    id: int
    deviation_id: int
    created_at: datetime
    updated_at: datetime
    five_whys_steps: List[FiveWhysStepResponse] = []
    fishbone_causes: List[FishboneCauseResponse] = []
    root_cause_proposals: List[RootCauseProposalResponse] = []

    model_config = ConfigDict(from_attributes=True)


class EvidenceItemBase(BaseModel):
    evidence_type: str
    description: Optional[str] = None
    source: Optional[str] = None
    collected: bool = False
    is_ai_flagged_missing: bool = False
    notes: Optional[str] = None

class EvidenceItemCreate(EvidenceItemBase):
    deviation_id: int

class EvidenceItemUpdate(BaseModel):
    evidence_type: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    collected: Optional[bool] = None
    is_ai_flagged_missing: Optional[bool] = None
    notes: Optional[str] = None

class EvidenceItemResponse(EvidenceItemBase):
    id: int
    deviation_id: int

    model_config = ConfigDict(from_attributes=True)


class CAPAActionBase(BaseModel):
    action_type: CapaActionType
    description: str
    rationale: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[date] = None
    status: CapaStatus = CapaStatus.Proposed
    ai_generated: bool = False
    reviewed_by_user: bool = False

class CAPAActionCreate(CAPAActionBase):
    deviation_id: int

class CAPAActionUpdate(BaseModel):
    action_type: Optional[CapaActionType] = None
    description: Optional[str] = None
    rationale: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[CapaStatus] = None
    ai_generated: Optional[bool] = None
    reviewed_by_user: Optional[bool] = None

class CAPAActionResponse(CAPAActionBase):
    id: int
    deviation_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeviationBase(BaseModel):
    deviation_number: str
    title: str
    description: str
    product_name: Optional[str] = None
    batch_lot_number: Optional[str] = None
    manufacturing_date: Optional[date] = None
    detected_date: Optional[date] = None
    site_block: SiteBlock
    severity: Severity
    status: DeviationStatus = DeviationStatus.Open
    source_document_text: Optional[str] = None

class DeviationCreate(DeviationBase):
    pass

class DeviationUpdate(BaseModel):
    deviation_number: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    product_name: Optional[str] = None
    batch_lot_number: Optional[str] = None
    manufacturing_date: Optional[date] = None
    detected_date: Optional[date] = None
    site_block: Optional[SiteBlock] = None
    severity: Optional[Severity] = None
    status: Optional[DeviationStatus] = None
    source_document_text: Optional[str] = None

class DeviationResponse(DeviationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeviationFullResponse(DeviationResponse):
    evidence_items: List[EvidenceItemResponse] = []
    rca_investigations: List[RCAInvestigationResponse] = []
    capa_actions: List[CAPAActionResponse] = []

    model_config = ConfigDict(from_attributes=True)


class AuditLogBase(BaseModel):
    entity_type: str
    entity_id: int
    field_changed: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: Optional[str] = None
    source: AuditSource

class AuditLogResponse(AuditLogBase):
    id: int
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)