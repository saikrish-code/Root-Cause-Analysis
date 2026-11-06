"""Seed data for local testing"""
from datetime import datetime, date
from app.db.session import engine
from app.models.deviation import (
    Deviation, EvidenceItem, RCAInvestigation, FiveWhysStep,
    FishboneCause, CAPAAction, AuditLog,
    SiteBlock, Severity, DeviationStatus, RCAMethod, RCAStatus,
    CapaActionType, CapaStatus, AuditSource
)


def seed_data():
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        # Clean existing data
        session.query(AuditLog).delete()
        session.query(CAPAAction).delete()
        session.query(FishboneCause).delete()
        session.query(FiveWhysStep).delete()
        session.query(RCAInvestigation).delete()
        session.query(EvidenceItem).delete()
        session.query(Deviation).delete()
        session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()

    session = SessionLocal()
    try:
        # Deviation 1: Equipment malfunction during tablet compression
        dev1 = Deviation(
            deviation_number="DEV-2026-001",
            title="Tablet press 3 sudden stop during Batch A234",
            description="During tablet compression of Batch A234, press 3 exhibited an emergency stop at 14:32. 45,000 tablets were in the die at the time.",
            product_name="Metformin 500mg",
            batch_lot_number="A234",
            manufacturing_date=date(2026, 10, 15),
            detected_date=date(2026, 10, 15),
            site_block=SiteBlock.Manufacturing,
            severity=Severity.Major,
            status=DeviationStatus.Under_Investigation,
            source_document_text="From: Operator John Smith - I noticed the press stopped suddenly around 14:32. The emergency stop was not pressed by anyone. Screen showed PLC error code E-45.",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(dev1)
        session.flush()

        EvidenceItem(
            deviation_id=dev1.id,
            evidence_type="equipment log",
            description="PLC error log showing E-45 at 14:32",
            source="Press 3 control system",
            collected=True,
            is_ai_flagged_missing=False,
            notes="Error code E-45 indicates power fluctuation"
        )
        EvidenceItem(
            deviation_id=dev1.id,
            evidence_type="batch record",
            description="Batch A234 compression record",
            source="Batch record BR-2026-A234",
            collected=True,
            is_ai_flagged_missing=False
        )
        EvidenceItem(
            deviation_id=dev1.id,
            evidence_type="interview note",
            description="Interview with operator John Smith",
            source="QA interview notes",
            collected=True,
            is_ai_flagged_missing=False
        )
        EvidenceItem(
            deviation_id=dev1.id,
            evidence_type="electrical inspection",
            description="Electrical panel inspection report",
            source="Maintenance dept",
            collected=False,
            is_ai_flagged_missing=True,
            notes="AI suggested this evidence may be missing and valuable"
        )

        rca1 = RCAInvestigation(
            deviation_id=dev1.id,
            method=RCAMethod.five_whys,
            status=RCAStatus.In_Progress,
            ai_generated=False,
            reviewed_by_user=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(rca1)
        session.flush()

        FiveWhysStep(
            rca_investigation_id=rca1.id,
            step_number=1,
            why_question="Why did tablet press 3 stop?",
            answer="PLC error E-45 was triggered",
            is_ai_suggested=True,
            user_edited=False
        )
        FiveWhysStep(
            rca_investigation_id=rca1.id,
            step_number=2,
            why_question="Why was PLC error E-45 triggered?",
            answer="Unexpected power fluctuation detected",
            is_ai_suggested=True,
            user_edited=False
        )
        FiveWhysStep(
            rca_investigation_id=rca1.id,
            step_number=3,
            why_question="Why was there a power fluctuation?",
            answer="Voltage drop from main panel B",
            is_ai_suggested=True,
            user_edited=False
        )

        CAPAAction(
            deviation_id=dev1.id,
            action_type=CapaActionType.Corrective,
            description="Replace faulty contactor in main panel B",
            rationale="Root cause identified as faulty contactor causing voltage drops",
            owner="Maintenance Lead",
            due_date=date(2026, 10, 25),
            status=CapaStatus.Proposed,
            ai_generated=False,
            reviewed_by_user=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        AuditLog(
            entity_type="Deviation",
            entity_id=dev1.id,
            field_changed="status",
            old_value="Open",
            new_value="Under Investigation",
            changed_by="system",
            source=AuditSource.user,
            changed_at=datetime.utcnow()
        )

        # Deviation 2: Out-of-spec dissolution in QC
        dev2 = Deviation(
            deviation_number="DEV-2026-002",
            title="Dissolution result 78% for Batch B567 - below spec 85%",
            description="QC testing of finished Batch B567 showed dissolution of 78% at 30 min, below specification of 85% minimum.",
            product_name="Atorvastatin 20mg",
            batch_lot_number="B567",
            manufacturing_date=date(2026, 10, 10),
            detected_date=date(2026, 10, 12),
            site_block=SiteBlock.QC_Lab,
            severity=Severity.Critical,
            status=DeviationStatus.RCA_Complete,
            source_document_text="From: QC Manager - Test ID DIS-2026-4567. Sample 1: 78%, Sample 2: 79%, Sample 3: 77%. Out of specification. Batch held pending investigation.",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(dev2)
        session.flush()

        EvidenceItem(
            deviation_id=dev2.id,
            evidence_type="lab result",
            description="Dissolution test report DIS-2026-4567",
            source="QC LIMS",
            collected=True,
            is_ai_flagged_missing=False
        )
        EvidenceItem(
            deviation_id=dev2.id,
            evidence_type="batch record",
            description="Batch B567 manufacturing and in-process data",
            source="Batch record BR-2026-B567",
            collected=True,
            is_ai_flagged_missing=False
        )
        EvidenceItem(
            deviation_id=dev2.id,
            evidence_type="raw material cert",
            description="Coated pellets COA from Supplier X",
            source="QA file",
            collected=True,
            is_ai_flagged_missing=False,
            notes="AI noted possible correlation with supplier lot variance"
        )

        rca2 = RCAInvestigation(
            deviation_id=dev2.id,
            method=RCAMethod.fishbone,
            status=RCAStatus.Completed,
            ai_generated=True,
            reviewed_by_user=True,
            confirmed_root_cause="Insufficient coating weight gain during pan coating operation due to suboptimal spray rate calibration",
            confidence_notes="High confidence - supported by in-process data showing spray rate deviation",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(rca2)
        session.flush()

        FishboneCause(
            rca_investigation_id=rca2.id,
            category="Machine",
            cause_text="Spray gun calibration drift on coater #2",
            is_ai_suggested=True,
            user_edited=True
        )
        FishboneCause(
            rca_investigation_id=rca2.id,
            category="Method",
            cause_text="SOP for spray rate verification not followed per shift",
            is_ai_suggested=True,
            user_edited=False
        )
        FishboneCause(
            rca_investigation_id=rca2.id,
            category="Material",
            cause_text="Higher porosity pellets absorbed coating solution differently",
            is_ai_suggested=False,
            user_edited=False
        )

        CAPAAction(
            deviation_id=dev2.id,
            action_type=CapaActionType.Corrective,
            description="Recoat Batch B567 with adjusted spray rate",
            rationale="Recover batch to meet specification",
            owner="Production Manager",
            due_date=date(2026, 10, 20),
            status=CapaStatus.Approved,
            ai_generated=True,
            reviewed_by_user=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        CAPAAction(
            deviation_id=dev2.id,
            action_type=CapaActionType.Preventive,
            description="Implement automated spray rate monitoring with alarms on all coating units",
            rationale="Prevent recurrence by continuous monitoring",
            owner="Engineering",
            due_date=date(2026, 11, 15),
            status=CapaStatus.Proposed,
            ai_generated=True,
            reviewed_by_user=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        AuditLog(
            entity_type="RCAInvestigation",
            entity_id=rca2.id,
            field_changed="confirmed_root_cause",
            old_value=None,
            new_value="Insufficient coating weight gain due to spray rate calibration",
            changed_by="AI-Agent",
            source=AuditSource.ai,
            changed_at=datetime.utcnow()
        )
        AuditLog(
            entity_type="RCAInvestigation",
            entity_id=rca2.id,
            field_changed="reviewed_by_user",
            old_value="False",
            new_value="True",
            changed_by="QA Reviewer",
            source=AuditSource.user,
            changed_at=datetime.utcnow()
        )

        session.commit()
        print("Seed data created successfully!")

    except Exception as e:
        session.rollback()
        print(f"Error creating seed data: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    seed_data()