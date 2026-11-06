from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.deviation import (
    Deviation, RCAInvestigation, FiveWhysStep, FishboneCause, RootCauseProposal,
    AuditLog, AuditSource
)
from app.schemas.deviation import (
    RCAInvestigationCreate, RCAInvestigationUpdate, RCAInvestigationResponse,
    FiveWhysStepCreate, FiveWhysStepUpdate, FiveWhysStepResponse,
    FishboneCauseCreate, FishboneCauseUpdate, FishboneCauseResponse,
    RootCauseProposalCreate, RootCauseProposalUpdate, RootCauseProposalResponse,
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
    db_investigation = RCAInvestigation(**investigation.model_dump(exclude={"five_whys_steps", "fishbone_causes", "root_cause_proposals"}))
    db.add(db_investigation)
    db.commit()
    db.refresh(db_investigation)
    
    if investigation.five_whys_steps:
        for step in investigation.five_whys_steps:
            db_step = FiveWhysStep(**step.model_dump(), rca_investigation_id=db_investigation.id)
            db.add(db_step)
            db.flush()
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
            db.flush()
            if cause.is_ai_suggested:
                audit_ai_field_change(
                    db=db,
                    entity_type="FishboneCause",
                    entity_id=db_cause.id,
                    field_changed="is_ai_suggested",
                    new_value=str(cause.is_ai_suggested),
                    changed_by="AI-Agent"
                )

    if investigation.root_cause_proposals:
        for proposal in investigation.root_cause_proposals:
            db_prop = RootCauseProposal(**proposal.model_dump(), rca_investigation_id=db_investigation.id)
            db.add(db_prop)
    
    db.commit()
    db.refresh(db_investigation)
    
    db.expire(db_investigation, ["five_whys_steps", "fishbone_causes", "root_cause_proposals"])
    
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
    
    if 'confirmed_root_cause' in update_data and update_data['confirmed_root_cause']:
        db.refresh(db_investigation, ["five_whys_steps", "fishbone_causes"])
        
        five_whys_unconfirmed = [
            step for step in db_investigation.five_whys_steps 
            if step.is_ai_suggested and not step.user_edited
        ]
        fishbone_unconfirmed = [
            cause for cause in db_investigation.fishbone_causes 
            if cause.is_ai_suggested and not cause.user_edited
        ]
        
        if five_whys_unconfirmed or fishbone_unconfirmed:
            raise HTTPException(
                status_code=400,
                detail="Cannot confirm root cause: unconfirmed AI-suggested items remain. Please confirm or edit all AI suggestions before finalizing."
            )
    
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


@router.get("/{id}/proposals", response_model=List[RootCauseProposalResponse])
def read_root_cause_proposals(id: int, db: Session = Depends(get_db)):
    proposals = (
        db.query(RootCauseProposal)
        .filter(RootCauseProposal.rca_investigation_id == id, RootCauseProposal.status != 'rejected')
        .all()
    )
    return proposals


@router.post("/{id}/proposals", response_model=RootCauseProposalResponse, status_code=status.HTTP_201_CREATED)
def create_root_cause_proposal(
    id: int,
    proposal: RootCauseProposalCreate,
    db: Session = Depends(get_db)
):
    db_investigation = db.query(RCAInvestigation).filter(RCAInvestigation.id == id).first()
    if db_investigation is None:
        raise HTTPException(status_code=404, detail="RCA investigation not found")
    
    db_proposal = RootCauseProposal(**proposal.model_dump(), rca_investigation_id=id)
    db.add(db_proposal)
    db.commit()
    db.refresh(db_proposal)
    return db_proposal


@router.patch("/proposals/{proposal_id}", response_model=RootCauseProposalResponse)
def update_root_cause_proposal(
    proposal_id: int,
    proposal: RootCauseProposalUpdate,
    db: Session = Depends(get_db)
):
    db_proposal = db.query(RootCauseProposal).filter(RootCauseProposal.id == proposal_id).first()
    if db_proposal is None:
        raise HTTPException(status_code=404, detail="Root cause proposal not found")
    
    update_data = proposal.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(db_proposal, field, None)
        if old_value != value and value is not None:
            setattr(db_proposal, field, value)
            audit_user_field_change(
                db=db,
                entity_type="RootCauseProposal",
                entity_id=proposal_id,
                field_changed=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(value),
                changed_by="system"
            )
    
    db.commit()
    db.refresh(db_proposal)
    return db_proposal


@router.delete("/proposals/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
def reject_root_cause_proposal(proposal_id: int, db: Session = Depends(get_db)):
    db_proposal = db.query(RootCauseProposal).filter(RootCauseProposal.id == proposal_id).first()
    if db_proposal is None:
        raise HTTPException(status_code=404, detail="Root cause proposal not found")
    
    # Log rejection to audit_log before setting status to rejected or deleting
    audit_user_field_change(
        db=db,
        entity_type="RootCauseProposal",
        entity_id=proposal_id,
        field_changed="status",
        old_value=db_proposal.status,
        new_value="rejected",
        changed_by="system"
    )
    
    db_proposal.status = "rejected"
    db.commit()
    return None
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