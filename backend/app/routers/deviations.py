from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.deviation import Deviation, EvidenceItem, AuditLog, AuditSource
from app.schemas.deviation import (
    DeviationCreate, DeviationUpdate, DeviationResponse, DeviationFullResponse,
    EvidenceItemCreate, EvidenceItemUpdate, EvidenceItemResponse,
    AuditLogResponse
)
from app.services.audit_service import audit_user_field_change

router = APIRouter(prefix="/api/deviations", tags=["deviations"])


@router.get("/", response_model=List[DeviationResponse])
def read_deviations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    deviations = db.query(Deviation).offset(skip).limit(limit).all()
    return deviations


@router.get("/{id}", response_model=DeviationResponse)
def read_deviation(id: int, db: Session = Depends(get_db)):
    deviation = db.query(Deviation).filter(Deviation.id == id).first()
    if deviation is None:
        raise HTTPException(status_code=404, detail="Deviation not found")
    return deviation


@router.get("/{id}/full", response_model=DeviationFullResponse)
def read_deviation_full(id: int, db: Session = Depends(get_db)):
    deviation = db.query(Deviation).filter(Deviation.id == id).first()
    if deviation is None:
        raise HTTPException(status_code=404, detail="Deviation not found")
    
    db.expire(deviation)
    db.refresh(deviation, ["evidence_items", "rca_investigations", "capa_actions"])
    
    return deviation


@router.post("/", response_model=DeviationResponse, status_code=status.HTTP_201_CREATED)
def create_deviation(
    deviation: DeviationCreate,
    db: Session = Depends(get_db)
):
    db_deviation = Deviation(**deviation.model_dump())
    db.add(db_deviation)
    db.commit()
    db.refresh(db_deviation)
    return db_deviation


@router.patch("/{id}", response_model=DeviationResponse)
def update_deviation_partial(
    id: int,
    deviation: DeviationUpdate,
    db: Session = Depends(get_db)
):
    db_deviation = db.query(Deviation).filter(Deviation.id == id).first()
    if db_deviation is None:
        raise HTTPException(status_code=404, detail="Deviation not found")
    
    update_data = deviation.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(db_deviation, field, None)
        if old_value != value and value is not None:
            setattr(db_deviation, field, value)
            audit_user_field_change(
                db=db,
                entity_type="Deviation",
                entity_id=id,
                field_changed=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(value),
                changed_by="system"
            )
    
    db.commit()
    db.refresh(db_deviation)
    return db_deviation


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deviation(id: int, db: Session = Depends(get_db)):
    deviation = db.query(Deviation).filter(Deviation.id == id).first()
    if deviation is None:
        raise HTTPException(status_code=404, detail="Deviation not found")
    db.delete(deviation)
    db.commit()
    return None