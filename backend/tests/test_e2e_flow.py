import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base, get_db
from app.main import app
from app.models.deviation import Deviation, EvidenceItem, RCAInvestigation, CAPAAction, AuditLog
from unittest.mock import patch

from app.core.config import settings

DATABASE_URL = "sqlite:///./e2e_test.db"
settings.DATABASE_URL = DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


class TestRCAEndToEndFlow:
    @patch('app.routers.ai.run_full_pipeline')
    def test_full_happy_path_and_failure_cases(self, mock_pipeline, client):
        from app.ai.schemas import IntakeResult, ExtractedDeviation, EvidenceGap, RCAResult, CAPAResult, RootCauseProposal, ProposedCAPA

        # Setup mock AI pipeline return value
        mock_pipeline.return_value = {
            "intake": IntakeResult(
                text_length=150,
                text_preview="Batch A123 deviation...",
                text_type="email",
                is_garbled=False,
                language_detected="en"
            ),
            "extraction": ExtractedDeviation(
                product_name="Paracetamol 500mg",
                batch_lot_number="A123",
                site_block="Manufacturing",
                severity="Major",
                title="Tablet compression stop",
                description="Press stopped during compression",
                raw_text="Batch A123 deviation in Manufacturing",
                extraction_confidence=0.95,
                missing_fields=[]
            ),
            "evidence_gap": EvidenceGap(
                missing_information=["Equipment maintenance log"],
                suggested_evidence_types=["Equipment log"],
                questions_to_investigate=["Was sensor calibrated?"],
                risk_flags=["Potential batch yield loss"]
            ),
            "rca": RCAResult(
                method_used="five_whys",
                root_cause_proposals=[
                    RootCauseProposal(
                        cause_type="Faulty contactor",
                        is_primary=True,
                        ai_rationale="Contactor failure caused voltage drop",
                        supporting_evidence_ids=[1],
                        confidence_score=0.9,
                        confidence_label="High"
                    )
                ],
                confidence_summary="High confidence",
                evidence_support_notes="Supported by logs",
                limitations="None"
            ),
            "capa": CAPAResult(
                proposed_capas=[
                    ProposedCAPA(
                        action_type="Corrective",
                        description="Replace contactor in panel B",
                        rationale="Addresses root cause",
                        owner="Maintenance",
                        priority="High",
                        estimated_effort="1 hour"
                    )
                ],
                immediate_actions=["Stop press"],
                long_term_improvements=["Inspection SOP"]
            ),
            "all_nodes_completed": True,
            "errors": None
        }

        # 1. Failure Case: Empty paste
        response = client.post("/api/ai/ingest", data={"raw_text": "   "})
        assert response.status_code == 400
        assert "too short or empty" in response.json()["detail"]

        # 2. Failure Case: Bad / Short PDF
        response = client.post(
            "/api/ai/ingest",
            files={"file": ("short.pdf", b"too short", "application/pdf")}
        )
        assert response.status_code == 400
        assert "Couldn't read this PDF" in response.json()["detail"]

        # 3. Happy Path: Ingest complaint email
        response = client.post(
            "/api/ai/ingest",
            data={"raw_text": "From: operator@pharma.com - Batch A123 deviation in Manufacturing"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["extraction"]["product_name"] == "Paracetamol 500mg"
        assert data["all_nodes_completed"] is True

        # 4. Create Deviation record in DB & associate RCA
        dev_res = client.post("/api/deviations/", json={
            "deviation_number": "DEV-E2E-001",
            "title": "Tablet compression stop",
            "description": "Press stopped during compression",
            "site_block": "Manufacturing",
            "severity": "Major"
        })
        assert dev_res.status_code == 201
        dev_id = dev_res.json()["id"]

        # 5. Create RCA investigation with proposals
        rca_res = client.post("/api/rca/", json={
            "deviation_id": dev_id,
            "method": "five_whys",
            "root_cause_proposals": [
                {
                    "cause_text": "Faulty contactor",
                    "ai_rationale": "Contactor failure caused voltage drop",
                    "is_primary": True,
                    "confidence_score": 90,
                    "status": "proposed"
                }
            ]
        })
        assert rca_res.status_code == 201
        rca_id = rca_res.json()["id"]
        proposal_id = rca_res.json()["root_cause_proposals"][0]["id"]

        # 6. Confirm Root Cause Proposal & Set Confirmed Root Cause
        patch_rca = client.patch(f"/api/rca/{rca_id}", json={
            "confirmed_root_cause": "Faulty contactor in main panel B"
        })
        assert patch_rca.status_code == 200

        # 7. Generate CAPA & Approve
        capa_res = client.post("/api/capa/", json={
            "deviation_id": dev_id,
            "action_type": "Corrective",
            "description": "Replace contactor in panel B",
            "rationale": "Directly addresses faulty contactor",
            "owner": "Maintenance Lead",
            "ai_generated": True
        })
        assert capa_res.status_code == 201
        capa_id = capa_res.json()["id"]

        approve_res = client.patch(f"/api/capa/{capa_id}", json={
            "status": "Approved"
        })
        assert approve_res.status_code == 200

        # 8. Verify Audit Trail and Investigation History
        audit_res = client.get(f"/api/deviations/{dev_id}/audit")
        assert audit_res.status_code == 200
        audit_logs = audit_res.json()
        assert len(audit_logs) >= 1
        assert any(log["entity_type"] in ["Deviation", "RCAInvestigation", "CAPAAction"] for log in audit_logs)

        # 9. Verify Full Nested Deviation Endpoint
        full_res = client.get(f"/api/deviations/{dev_id}/full")
        assert full_res.status_code == 200
        full_data = full_res.json()
        assert full_data["id"] == dev_id
        assert len(full_data["rca_investigations"]) == 1
        assert len(full_data["capa_actions"]) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
