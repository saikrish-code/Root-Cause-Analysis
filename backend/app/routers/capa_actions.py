from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.deviation import CAPAAction, AuditSource
from app.schemas.deviation import (
    CAPAActionCreate, CAPAActionUpdate, CAPAActionResponse
)
from app.services.audit_service import audit_user_field_change, audit_ai_field_change

router = APIRouter(prefix="/api/capa", tags=["capa_actions"])


@router.get("/", response_model=List[CAPAActionResponse])
def read_capa_actions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    capa_actions = db.query(CAPAAction).offset(skip).limit(limit).all()
    return capa_actions


@router.get("/{id}", response_model=CAPAActionResponse)
def read_capa_action(id: int, db: Session = Depends(get_db)):
    capa_action = db.query(CAPAAction).filter(CAPAAction.id == id).first()
    if capa_action is None:
        raise HTTPException(status_code=404, detail="CAPA action not found")
    return capa_action


@router.post("/", response_model=CAPAActionResponse, status_code=status.HTTP_201_CREATED)
def create_capa_action(
    capa_action: CAPAActionCreate,
    db: Session = Depends(get_db)
):
    db_capa = CAPAAction(**capa_action.model_dump())
    db.add(db_capa)
    db.commit()
    db.refresh(db_capa)
    
    if capa_action.ai_generated:
        audit_ai_field_change(
            db=db,
            entity_type="CAPAAction",
            entity_id=db_capa.id,
            field_changed="ai_generated",
            new_value=str(capa_action.ai_generated),
            changed_by="AI-Agent"
        )
    
    return db_capa


@router.patch("/{id}", response_model=CAPAActionResponse)
def update_capa_action_partial(
    id: int,
    capa_action: CAPAActionUpdate,
    db: Session = Depends(get_db)
):
    db_capa = db.query(CAPAAction).filter(CAPAAction.id == id).first()
    if db_capa is None:
        raise HTTPException(status_code=404, detail="CAPA action not found")
    
    update_data = capa_action.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(db_capa, field, None)
        if old_value != value and value is not None:
            setattr(db_capa, field, value)
            audit_user_field_change(
                db=db,
                entity_type="CAPAAction",
                entity_id=id,
                field_changed=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(value),
                changed_by="system"
            )
    
    db.commit()
    db.refresh(db_capa)
    return db_capa


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_capa_action(id: int, db: Session = Depends(get_db)):
    capa_action = db.query(CAPAAction).filter(CAPAAction.id == id).first()
    if capa_action is None:
        raise HTTPException(status_code=404, detail="CAPA action not found")
    db.delete(capa_action)
    db.commit()
    return None