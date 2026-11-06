from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.deviation import AuditLog, AuditSource


def create_audit_log(
    db: Session,
    entity_type: str,
    entity_id: int,
    field_changed: str,
    old_value: Optional[str],
    new_value: Optional[str],
    changed_by: Optional[str],
    source: AuditSource
) -> AuditLog:
    audit_log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by,
        source=source,
        changed_at=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log


def audit_ai_field_change(
    db: Session,
    entity_type: str,
    entity_id: int,
    field_changed: str,
    new_value: Optional[str],
    changed_by: Optional[str] = "AI-Agent"
) -> AuditLog:
    return create_audit_log(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id,
        field_changed=field_changed,
        old_value=None,
        new_value=new_value,
        changed_by=changed_by,
        source=AuditSource.ai
    )


def audit_user_field_change(
    db: Session,
    entity_type: str,
    entity_id: int,
    field_changed: str,
    old_value: Optional[str],
    new_value: Optional[str],
    changed_by: Optional[str] = "system"
) -> AuditLog:
    return create_audit_log(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by,
        source=AuditSource.user
    )
