"""
Verification script for end-to-end flow testing
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import date
from app.ai.schemas import (
    IntakeResult, ExtractedDeviation, EvidenceGap, RCAResult, CAPAResult, ProposedCAPA, RootCauseProposal
)
from app.ai.graph import run_full_pipeline


class TestRCAEndToEndFlow:
    """Test the complete RCA workflow from ingestion to CAPA approval"""

    @patch('app.ai.groq_client.groq_client')
    def test_complete_happy_path_and_failure_cases(self, mock_client):
        # Setup mock responses for different stages
        mock_client.extraction.return_value = ExtractedDeviation(
            product_name="Paracetamol 500mg",
            batch_lot_number="A123",
            site_block="Manufacturing",
            severity="Major",
            title="Tablet compression stop",
            description="Press stopped during compression",
            raw_text="Batch A123 deviation in Manufacturing",
            extraction_confidence=0.95,
            manufacturing_date=date(2026, 10, 1),
            detected_date=date(2026, 11, 7),
            missing_fields=[]
        )

        mock_client.evidence_gap.return_value = EvidenceGap(
            missing_information=["Equipment maintenance log"],
            suggested_evidence_types=["Equipment log"],
            questions_to_investigate=["Was sensor calibrated?"],
            risk_flags=["Potential batch yield loss"]
        )

        mock_client.rca_analysis.return_value = RCAResult(
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
        )

        mock_client.capa_proposal.return_value = CAPAResult(
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
        )

        # Test 1: Empty paste error handling
        result = run_full_pipeline(raw_text="   ", deviation_id=None, existing_evidence=[])
        assert result["errors"] is not None
        assert any("Text content is too short" in error for error in result["errors"])

        # Test 2: Valid input processing
        result = run_full_pipeline(
            raw_text="From: operator@pharma.com - Batch A123 deviation in Manufacturing",
            deviation_id=None,
            existing_evidence=[]
        )
        assert result["all_nodes_completed"] is True
        assert result["extraction"] is not None
        assert result["extraction"].product_name == "Paracetamol 500mg"
        assert result["evidence_gap"] is not None
        assert result["rca"] is not None
        assert result["capa"] is not None

        # Test 3: Database integration flow
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from app.db.session import Base, get_db

        DATABASE_URL = "sqlite:///./e2e_test_integration.db"
        from app.core.config import settings
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

        # Create deviation via API endpoint
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)

        deviation_data = {
            "deviation_number": "DEV-INTEGRATION-001",
            "title": "Tablet compression stop",
            "description": "Press stopped during compression",
            "site_block": "Manufacturing",
            "severity": "Major"
        }

        response = client.post("/api/deviations/", json=deviation_data)
        assert response.status_code == 201
        dev_id = response.json()["id"]

        # Create RCA investigation
        rca_data = {
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
        }

        response = client.post("/api/rca/", json=rca_data)
        assert response.status_code == 201
        rca_id = response.json()["id"]

        # Confirm root cause
        patch_response = client.patch(f"/api/rca/{rca_id}", json={
            "confirmed_root_cause": "Faulty contactor in main panel B"
        })
        assert patch_response.status_code == 200

        # Generate CAPA
        capa_data = {
            "deviation_id": dev_id,
            "action_type": "Corrective",
            "description": "Replace contactor in panel B",
            "rationale": "Directly addresses faulty contactor",
            "owner": "Maintenance Lead",
            "ai_generated": True
        }

        capa_response = client.post("/api/capa/", json=capa_data)
        assert capa_response.status_code == 201
        capa_id = capa_response.json()["id"]

        # Approve CAPA
        approve_response = client.patch(f"/api/capa/{capa_id}", json={
            "status": "Approved"
        })
        assert approve_response.status_code == 200

        # Verify audit log
        audit_response = client.get(f"/api/deviations/{dev_id}/audit")
        assert audit_response.status_code == 200
        audit_logs = audit_response.json()
        assert len(audit_logs) >= 3  # Deviation, RCA, CAPA

        # Verify full nested deviation endpoint
        full_response = client.get(f"/api/deviations/{dev_id}/full")
        assert full_response.status_code == 200
        full_data = full_response.json()
        assert full_data["id"] == dev_id
        assert len(full_data["rca_investigations"]) == 1
        assert len(full_data["capa_actions"]) == 1

        # Cleanup
        Base.metadata.drop_all(bind=engine)

        print("✓ All end-to-end integration tests passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
