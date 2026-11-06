from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.deviation import (
    Deviation, RCAInvestigation, FiveWhysStep, FishboneCause,
    AuditLog, AuditSource
)
from app.schemas.deviation import (
    RCAInvestigationCreate, RCAInvestigationUpdate, RCAInvestigationResponse,
    FiveWhysStepCreate, FiveWhysStepUpdate, FiveWhysStepResponse,
    FishboneCauseCreate, FishboneCauseUpdate, FishboneCauseResponse,
    DeviationCreate, DeviationUpdate, DeviationResponse, DeviationFullResponse,
    AuditLogResponse
)
from app.services.audit_service import audit_user_field_change, audit_ai_field_change

router = APIRouter(prefix="/api/rca", tags=["rca_investigations"])


@router.get("/", response_model=List[RCAInvestigationResponse])
def read_rca_investigations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    investigations = (
        db.query(RCAInvestigation)
        .options(
            joinedload(RCAInvestigation.five_whys_steps),
            joinedload(RCAInvestigation.fishbone_causes)
        )
        .offset(skip)
        .limit(limit)
        .all()
    )
    return investigations


@router.get("/{id}", response_model=RCAInvestigationResponse)
def read_rca_investigation(id: int, db: Session = Depends(get_db)):
    investigation = (
        db.query(RCAInvestigation)
        .options(
            joinedload(RCAInvestigation.five_whys_steps),
            joinedload(RCAInvestigation.fishbone_causes)
        )
        .filter(RCAInvestigation.id == id)
        .first()
    )
    if investigation is None:
        raise HTTPException(status_code=404, detail="RCA investigation not found")
    return investigation


@router.post("/", response_model=RCAInvestigationResponse, status_code=status.HTTP_201_CREATED)
def create_rca_investigation(
    investigation: RCAInvestigationCreate,
    db: Session = Depends(get_db)
):
    db_investigation = RCAInvestigation(**investigation.model_dump(exclude={"five_whys_steps", "fishbone_causes"}))
    db.add(db_investigation)
    db.commit()
    db.refresh(db_investigation)
    
    if investigation.five_whys_steps:
        for step in investigation.five_whys_steps:
            db_step = FiveWhysStep(**step.model_dump(), rca_investigation_id=db_investigation.id)
            db.add(db_step)
            if step.is_ai_suggested:
                audit_ai_field_change(
                    db=db,
                    entity_type="FiveWhysStep",
                    entity_id=db_step.id,
                    field_changed="is_ai_suggested",
                    new_value=str(step.is_ai_suggested),
                    changed_by="AI-Agent"
                )
    
    if investigation.fishbone_causes:
        for cause in investigation.fishbone_causes:
            db_cause = FishboneCause(**cause.model_dump(), rca_investigation_id=db_investigation.id)
            db.add(db_cause)
            if cause.is_ai_suggested:
                audit_ai_field_change(
                    db=db,
                    entity_type="FishboneCause",
                    entity_id=db_cause.id,
                    field_changed="is_ai_suggested",
                    new_value=str(cause.is_ai_suggested),
                    changed_by="AI-Agent"
                )
    
    db.commit()
    db.refresh(db_investigation)
    
    db.expire(db_investigation, ["five_whys_steps", "fishbone_causes"])
    
    return db_investigation


@router.patch("/{id}", response_model=RCAInvestigationResponse)
def update_rca_investigation_partial(
    id: int,
    investigation: RCAInvestigationUpdate,
    db: Session = Depends(get_db)
):
    db_investigation = db.query(RCAInvestigation).filter(RCAInvestigation.id == id).first()
    if db_investigation is None:
        raise HTTPException(status_code=404, detail="RCA investigation not found")
    
    update_data = investigation.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(db_investigation, field, None)
        if old_value != value and value is not None:
            setattr(db_investigation, field, value)
            audit_user_field_change(
                db=db,
                entity_type="RCAInvestigation",
                entity_id=id,
                field_changed=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(value),
                changed_by="system"
            )
    
    db.commit()
    db.refresh(db_investigation)
    return db_investigation


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rca_investigation(id: int, db: Session = Depends(get_db)):
    investigation = db.query(RCAInvestigation).filter(RCAInvestigation.id == id).first()
    if investigation is None:
        raise HTTPException(status_code=404, detail="RCA investigation not found")
    db.delete(investigation)
    db.commit()
    return None


@router.get("/{id}/steps", response_model=List[FiveWhysStepResponse])
def read_five_whys_steps(id: int, db: Session = Depends(get_db)):
    steps = (
        db.query(FiveWhysStep)
        .filter(FiveWhysStep.rca_investigation_id == id)
        .order_by(FiveWhysStep.step_number)
        .all()
    )
    return steps


@router.post("/{id}/steps", response_model=FiveWhysStepResponse, status_code=status.HTTP_201_CREATED)
def create_five_whys_step(
    id: int,
    step: FiveWhysStepCreate,
    db: Session = Depends(get_db)
):
    db_investigation = db.query(RCAInvestigation).filter(RCAInvestigation.id == id).first()
    if db_investigation is None:
        raise HTTPException(status_code=404, detail="RCA investigation not found")
    
    db_step = FiveWhysStep(**step.model_dump(), rca_investigation_id=id)
    db.add(db_step)
    db.commit()
    db.refresh(db_step)
    
    if step.is_ai_suggested:
        audit_ai_field_change(
            db=db,
            entity_type="FiveWhysStep",
            entity_id=db_step.id,
            field_changed="is_ai_suggested",
            new_value=str(step.is_ai_suggested),
            changed_by="AI-Agent"
        )
    
    return db_step


@router.patch("/steps/{id}", response_model=FiveWhysStepResponse)
def update_five_whys_step_partial(
    id: int,
    step: FiveWhysStepUpdate,
    db: Session = Depends(get_db)
):
    db_step = db.query(FiveWhysStep).filter(FiveWhysStep.id == id).first()
    if db_step is None:
        raise HTTPException(status_code=404, detail="Five Whys step not found")
    
    update_data = step.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(db_step, field, None)
        if old_value != value and value is not None:
            setattr(db_step, field, value)
            audit_user_field_change(
                db=db,
                entity_type="FiveWhysStep",
                entity_id=id,
                field_changed=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(value),
                changed_by="system"
            )
    
    db.commit()
    db.refresh(db_step)
    return db_step


@router.delete("/steps/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_five_whys_step(id: int, db: Session = Depends(get_db)):
    step = db.query(FiveWhysStep).filter(FiveWhysStep.id == id).first()
    if step is None:
        raise HTTPException(status_code=404, detail="Five Whys step not found")
    db.delete(step)
    db.commit()
    return None


@router.get("/{id}/causes", response_model=List[FishboneCauseResponse])
def read_fishbone_causes(id: int, db: Session = Depends(get_db)):
    causes = (
        db.query(FishboneCause)
        .filter(FishboneCause.rca_investigation_id == id)
        .all()
    )
    return causes


@router.post("/{id}/causes", response_model=FishboneCauseResponse, status_code=status.HTTP_201_CREATED)
def create_fishbone_cause(
    id: int,
    cause: FishboneCauseCreate,
    db: Session = Depends(get_db)
):
    db_investigation = db.query(RCAInvestigation).filter(RCAInvestigation.id == id).first()
    if db_investigation is None:
        raise HTTPException(status_code=404, detail="RCA investigation not found")
    
    db_cause = FishboneCause(**cause.model_dump(), rca_investigation_id=id)
    db.add(db_cause)
    db.commit()
    db.refresh(db_cause)
    
    if cause.is_ai_suggested:
        audit_ai_field_change(
            db=db,
            entity_type="FishboneCause",
            entity_id=db_cause.id,
            field_changed="is_ai_suggested",
            new_value=str(cause.is_ai_suggested),
            changed_by="AI-Agent"
        )
    
    return db_cause


@router.patch("/causes/{id}", response_model=FishboneCauseResponse)
def update_fishbone_cause_partial(
    id: int,
    cause: FishboneCauseUpdate,
    db: Session = Depends(get_db)
):
    db_cause = db.query(FishboneCause).filter(FishboneCause.id == id).first()
    if db_cause is None:
        raise HTTPException(status_code=404, detail="Fishbone cause not found")
    
    update_data = cause.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(db_cause, field, None)
        if old_value != value and value is not None:
            setattr(db_cause, field, value)
            audit_user_field_change(
                db=db,
                entity_type="FishboneCause",
                entity_id=id,
                field_changed=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(value),
                changed_by="system"
            )
    
    db.commit()
    db.refresh(db_cause)
    return db_cause


@router.delete("/causes/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fishbone_cause(id: int, db: Session = Depends(get_db)):
    cause = db.query(FishboneCause).filter(FishboneCause.id == id).first()
    if cause is None:
        raise HTTPException(status_code=404, detail="Fishbone cause not found")
    db.delete(cause)
    db.commit()
    return None