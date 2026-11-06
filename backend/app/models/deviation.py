import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
from app.db.session import Base

class SiteBlock(enum.Enum):
    Manufacturing = "Manufacturing"
    Packaging = "Packaging"
    QC_Lab = "QC Lab"
    Warehouse = "Warehouse"
    Utilities = "Utilities"

class Severity(enum.Enum):
    Critical = "Critical"
    Major = "Major"
    Minor = "Minor"

class DeviationStatus(enum.Enum):
    Open = "Open"
    Under_Investigation = "Under Investigation"
    RCA_Complete = "RCA Complete"
    CAPA_Assigned = "CAPA Assigned"
    Closed = "Closed"

class RCAMethod(enum.Enum):
    five_whys = "five_whys"
    fishbone = "fishbone"

class RCAStatus(enum.Enum):
    In_Progress = "In Progress"
    Completed = "Completed"
    Rejected = "Rejected"

class CapaStatus(enum.Enum):
    Proposed = "Proposed"
    Approved = "Approved"
    In_Progress = "In Progress"
    Completed = "Completed"

class CapaActionType(enum.Enum):
    Corrective = "Corrective"
    Preventive = "Preventive"

class AuditSource(enum.Enum):
    ai = "ai"
    user = "user"


class Deviation(Base):
    __tablename__ = "deviations"

    id = Column(Integer, primary_key=True, index=True)
    deviation_number = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    product_name = Column(String(255), nullable=True)
    batch_lot_number = Column(String(100), nullable=True)
    manufacturing_date = Column(Date, nullable=True)
    detected_date = Column(Date, nullable=True)
    site_block = Column(Enum(SiteBlock, values_callable=lambda x: [e.value for e in x]), nullable=False)
    severity = Column(Enum(Severity, values_callable=lambda x: [e.value for e in x]), nullable=False)
    status = Column(Enum(DeviationStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=DeviationStatus.Open)
    source_document_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    evidence_items = relationship("EvidenceItem", back_populates="deviation", cascade="all, delete-orphan")
    rca_investigations = relationship("RCAInvestigation", back_populates="deviation", cascade="all, delete-orphan")
    capa_actions = relationship("CAPAAction", back_populates="deviation", cascade="all, delete-orphan")


class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(Integer, primary_key=True, index=True)
    deviation_id = Column(Integer, ForeignKey("deviations.id", ondelete="CASCADE"), nullable=False)
    evidence_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String(255), nullable=True)
    collected = Column(Boolean, default=False, nullable=False)
    is_ai_flagged_missing = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)

    deviation = relationship("Deviation", back_populates="evidence_items")


class RCAInvestigation(Base):
    __tablename__ = "rca_investigations"

    id = Column(Integer, primary_key=True, index=True)
    deviation_id = Column(Integer, ForeignKey("deviations.id", ondelete="CASCADE"), nullable=False)
    method = Column(Enum(RCAMethod, values_callable=lambda x: [e.value for e in x]), nullable=False)
    status = Column(Enum(RCAStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=RCAStatus.In_Progress)
    ai_generated = Column(Boolean, default=False, nullable=False)
    reviewed_by_user = Column(Boolean, default=False, nullable=False)
    confirmed_root_cause = Column(Text, nullable=True)
    confidence_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    deviation = relationship("Deviation", back_populates="rca_investigations")
    five_whys_steps = relationship("FiveWhysStep", back_populates="rca_investigation", cascade="all, delete-orphan")
    fishbone_causes = relationship("FishboneCause", back_populates="rca_investigation", cascade="all, delete-orphan")
    root_cause_proposals = relationship("RootCauseProposal", back_populates="rca_investigation", cascade="all, delete-orphan")


class FiveWhysStep(Base):
    __tablename__ = "five_whys_steps"

    id = Column(Integer, primary_key=True, index=True)
    rca_investigation_id = Column(Integer, ForeignKey("rca_investigations.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    why_question = Column(Text, nullable=True)
    answer = Column(Text, nullable=False)
    is_ai_suggested = Column(Boolean, default=False, nullable=False)
    user_edited = Column(Boolean, default=False, nullable=False)

    rca_investigation = relationship("RCAInvestigation", back_populates="five_whys_steps")


class FishboneCause(Base):
    __tablename__ = "fishbone_causes"

    id = Column(Integer, primary_key=True, index=True)
    rca_investigation_id = Column(Integer, ForeignKey("rca_investigations.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(50), nullable=False)
    cause_text = Column(Text, nullable=False)
    is_ai_suggested = Column(Boolean, default=False, nullable=False)
    user_edited = Column(Boolean, default=False, nullable=False)

    rca_investigation = relationship("RCAInvestigation", back_populates="fishbone_causes")


class RootCauseProposal(Base):
    __tablename__ = "root_cause_proposals"

    id = Column(Integer, primary_key=True, index=True)
    rca_investigation_id = Column(Integer, ForeignKey("rca_investigations.id", ondelete="CASCADE"), nullable=False)
    cause_text = Column(Text, nullable=False)
    ai_rationale = Column(Text, nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    confidence_score = Column(Integer, nullable=False)
    supporting_evidence_ids = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default='proposed')
    user_edited = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    rca_investigation = relationship("RCAInvestigation", back_populates="root_cause_proposals")


class CAPAAction(Base):
    __tablename__ = "capa_actions"

    id = Column(Integer, primary_key=True, index=True)
    deviation_id = Column(Integer, ForeignKey("deviations.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(Enum(CapaActionType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    description = Column(Text, nullable=False)
    rationale = Column(Text, nullable=True)
    owner = Column(String(255), nullable=True)
    due_date = Column(Date, nullable=True)
    status = Column(Enum(CapaStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=CapaStatus.Proposed)
    ai_generated = Column(Boolean, default=False, nullable=False)
    reviewed_by_user = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    deviation = relationship("Deviation", back_populates="capa_actions")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    field_changed = Column(String(100), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    changed_by = Column(String(255), nullable=True)
    source = Column(Enum(AuditSource, values_callable=lambda x: [e.value for e in x]), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)