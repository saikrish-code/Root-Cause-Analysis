from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.deviation import EvidenceItem
from app.schemas.deviation import (
    EvidenceItemCreate, EvidenceItemUpdate, EvidenceItemResponse
)
from app.services.audit_service import audit_user_field_change, audit_ai_field_change

router = APIRouter(prefix="/api/evidence", tags=["evidence_items"])


@router.get("/", response_model=List[EvidenceItemResponse])
def read_evidence_items(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    evidence_items = db.query(EvidenceItem).offset(skip).limit(limit).all()
    return evidence_items


@router.get("/{id}", response_model=EvidenceItemResponse)
def read_evidence_item(id: int, db: Session = Depends(get_db)):
    evidence_item = db.query(EvidenceItem).filter(EvidenceItem.id == id).first()
    if evidence_item is None:
        raise HTTPException(status_code=404, detail="Evidence item not found")
    return evidence_item


@router.post("/", response_model=EvidenceItemResponse, status_code=status.HTTP_201_CREATED)
def create_evidence_item(
    evidence_item: EvidenceItemCreate,
    db: Session = Depends(get_db)
):
    db_evidence = EvidenceItem(**evidence_item.model_dump())
    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)
    return db_evidence


@router.patch("/{id}", response_model=EvidenceItemResponse)
def update_evidence_item_partial(
    id: int,
    evidence_item: EvidenceItemUpdate,
    db: Session = Depends(get_db)
):
    db_evidence = db.query(EvidenceItem).filter(EvidenceItem.id == id).first()
    if db_evidence is None:
        raise HTTPException(status_code=404, detail="Evidence item not found")
    
    update_data = evidence_item.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(db_evidence, field, None)
        if old_value != value and value is not None:
            setattr(db_evidence, field, value)
            audit_user_field_change(
                db=db,
                entity_type="EvidenceItem",
                entity_id=id,
                field_changed=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(value),
                changed_by="system"
            )
    
    db.commit()
    db.refresh(db_evidence)
    return db_evidence


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evidence_item(id: int, db: Session = Depends(get_db)):
    evidence_item = db.query(EvidenceItem).filter(EvidenceItem.id == id).first()
    if evidence_item is None:
        raise HTTPException(status_code=404, detail="Evidence item not found")
    db.delete(evidence_item)
    db.commit()
    return None