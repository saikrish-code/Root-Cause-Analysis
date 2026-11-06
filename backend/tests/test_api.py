import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base, get_db
from app.main import app
from app.models.deviation import (
    Deviation, EvidenceItem, RCAInvestigation, FiveWhysStep,
    FishboneCause, CAPAAction, AuditLog
)

DATABASE_URL = "sqlite:///./test.db"

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
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)


class TestDeviationsCRUD:
    def test_create_deviation(self, client):
        deviation_data = {
            "deviation_number": "DEV-TEST-001",
            "title": "Test Deviation",
            "description": "Test description",
            "site_block": "Manufacturing",
            "severity": "Major"
        }
        response = client.post("/api/deviations/", json=deviation_data)
        assert response.status_code == 201
        data = response.json()
        assert data["deviation_number"] == "DEV-TEST-001"
        assert data["status"] == "Open"
        assert "id" in data

    def test_read_deviations(self, client):
        response = client.get("/api/deviations/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_read_deviation(self, client):
        create_response = client.post("/api/deviations/", json={
            "deviation_number": "DEV-TEST-002",
            "title": "Test Deviation 2",
            "description": "Test description",
            "site_block": "QC Lab",
            "severity": "Critical"
        })
        print("STATUS:", create_response.status_code, "TEXT:", create_response.text)
        dev_id = create_response.json()["id"]
        
        response = client.get(f"/api/deviations/{dev_id}")
        assert response.status_code == 200
        assert response.json()["id"] == dev_id

    def test_patch_deviation(self, client):
        create_response = client.post("/api/deviations/", json={
            "deviation_number": "DEV-TEST-003",
            "title": "Original Title",
            "description": "Original description",
            "site_block": "Warehouse",
            "severity": "Minor"
        })
        dev_id = create_response.json()["id"]
        
        response = client.patch(f"/api/deviations/{dev_id}", json={"title": "Updated Title"})
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    def test_delete_deviation(self, client):
        create_response = client.post("/api/deviations/", json={
            "deviation_number": "DEV-TEST-004",
            "title": "To Delete",
            "description": "Will be deleted",
            "site_block": "Utilities",
            "severity": "Major"
        })
        dev_id = create_response.json()["id"]
        
        response = client.delete(f"/api/deviations/{dev_id}")
        assert response.status_code == 204
        
        get_response = client.get(f"/api/deviations/{dev_id}")
        assert get_response.status_code == 404


class TestNestedFetch:
    def test_get_deviation_full(self, client):
        create_response = client.post("/api/deviations/", json={
            "deviation_number": "DEV-NESTED-001",
            "title": "Nested Test",
            "description": "Testing nested fetch",
            "site_block": "Packaging",
            "severity": "Critical"
        })
        dev_id = create_response.json()["id"]
        
        response = client.get(f"/api/deviations/{dev_id}/full")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == dev_id
        assert "evidence_items" in data
        assert "rca_investigations" in data
        assert "capa_actions" in data


class TestAuditLogging:
    def test_audit_log_on_deviation_create(self, client):
        client.post("/api/deviations/", json={
            "deviation_number": "DEV-AUDIT-001",
            "title": "Audit Test",
            "description": "Testing audit",
            "site_block": "Manufacturing",
            "severity": "Major"
        })
        
        response = client.get("/api/deviations/")
        dev_id = response.json()[-1]["id"]
        
        audit_response = client.get(f"/api/evidence/")
        assert audit_response.status_code == 200

    def test_audit_log_on_user_edit(self, client):
        create_response = client.post("/api/deviations/", json={
            "deviation_number": "DEV-AUDIT-002",
            "title": "Before Edit",
            "description": "Will be edited",
            "site_block": "QC Lab",
            "severity": "Critical"
        })
        dev_id = create_response.json()["id"]
        
        client.patch(f"/api/deviations/{dev_id}", json={"title": "After Edit"})
        
        db = TestingSessionLocal()
        try:
            audit_logs = db.query(AuditLog).filter(
                AuditLog.entity_type == "Deviation",
                AuditLog.entity_id == dev_id
            ).all()
            assert len(audit_logs) >= 1
            assert any(log.field_changed == "title" for log in audit_logs)
        finally:
            db.close()


class TestEvidenceItems:
    def test_create_evidence_item(self, client):
        dev_response = client.post("/api/deviations/", json={
            "deviation_number": "DEV-EVID-001",
            "title": "Evidence Test",
            "description": "Testing evidence",
            "site_block": "Manufacturing",
            "severity": "Major"
        })
        dev_id = dev_response.json()["id"]
        
        evidence_data = {
            "deviation_id": dev_id,
            "evidence_type": "batch record",
            "description": "Batch record review",
            "source": "Production",
            "collected": True
        }
        response = client.post("/api/evidence/", json=evidence_data)
        assert response.status_code == 201
        assert response.json()["deviation_id"] == dev_id
        assert response.json()["evidence_type"] == "batch record"


class TestRCAInvestigations:
    def test_create_rca_with_nested_steps(self, client):
        dev_response = client.post("/api/deviations/", json={
            "deviation_number": "DEV-RCA-001",
            "title": "RCA Test",
            "description": "Testing RCA",
            "site_block": "Packaging",
            "severity": "Major"
        })
        dev_id = dev_response.json()["id"]
        
        rca_data = {
            "deviation_id": dev_id,
            "method": "five_whys",
            "five_whys_steps": [
                {"step_number": 1, "answer": "Press stopped", "is_ai_suggested": True},
                {"step_number": 2, "answer": "Power fluctuation", "is_ai_suggested": True},
                {"step_number": 3, "answer": "Faulty contactor", "is_ai_suggested": False}
            ]
        }
        response = client.post("/api/rca/", json=rca_data)
        assert response.status_code == 201
        assert len(response.json()["five_whys_steps"]) == 3

    def test_create_rca_with_fishbone_causes(self, client):
        dev_response = client.post("/api/deviations/", json={
            "deviation_number": "DEV-RCA-002",
            "title": "Fishbone Test",
            "description": "Testing fishbone",
            "site_block": "QC Lab",
            "severity": "Critical"
        })
        dev_id = dev_response.json()["id"]
        
        rca_data = {
            "deviation_id": dev_id,
            "method": "fishbone",
            "fishbone_causes": [
                {"category": "Machine", "cause_text": "Calibration drift", "is_ai_suggested": True},
                {"category": "Method", "cause_text": "SOP not followed", "is_ai_suggested": False}
            ]
        }
        response = client.post("/api/rca/", json=rca_data)
        assert response.status_code == 201
        assert len(response.json()["fishbone_causes"]) == 2


class TestCAPAActions:
    def test_create_capa_action(self, client):
        dev_response = client.post("/api/deviations/", json={
            "deviation_number": "DEV-CAPA-001",
            "title": "CAPA Test",
            "description": "Testing CAPA",
            "site_block": "Warehouse",
            "severity": "Major"
        })
        dev_id = dev_response.json()["id"]
        
        capa_data = {
            "deviation_id": dev_id,
            "action_type": "Corrective",
            "description": "Replace faulty equipment",
            "owner": "Maintenance Lead",
            "due_date": "2026-11-20",
            "ai_generated": True
        }
        response = client.post("/api/capa/", json=capa_data)
        assert response.status_code == 201
        assert response.json()["action_type"] == "Corrective"
        assert response.json()["ai_generated"] == True


class TestValidationErrors:
    def test_create_deviation_missing_required(self, client):
        response = client.post("/api/deviations/", json={
            "deviation_number": "DEV-VALID-001"
        })
        assert response.status_code == 422

    def test_invalid_enum_value(self, client):
        response = client.post("/api/deviations/", json={
            "deviation_number": "DEV-VALID-002",
            "title": "Invalid Enum Test",
            "description": "Testing invalid enum",
            "site_block": "InvalidBlock",
            "severity": "Major"
        })
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])