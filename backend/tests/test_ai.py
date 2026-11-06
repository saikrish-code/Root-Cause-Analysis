import pytest
from unittest.mock import patch, MagicMock
from datetime import date
from app.ai.schemas import (
    IntakeResult, ExtractedDeviation, EvidenceGap, RCAResult, CAPAResult, ProposedCAPA, RootCauseProposal
)


class TestIntakeNode:
    def test_intake_detects_email(self):
        from app.ai.nodes import intake_node, PipelineState

        state: PipelineState = {"raw_text": "From: operator@pharma.com\nBatch A123 issue detected"}
        result = intake_node(state)

        assert result["intake"] is not None
        assert result["intake"].text_type == "email"
        assert result["intake"].is_garbled is False

    def test_intake_detects_batch_record(self):
        from app.ai.nodes import intake_node, PipelineState

        state: PipelineState = {"raw_text": "Batch record review for Batch XYZ shows deviation"}
        result = intake_node(state)

        assert result["intake"] is not None
        assert result["intake"].text_type == "batch record"

    def test_intake_detects_garbled_text(self):
        from app.ai.nodes import intake_node, PipelineState

        state: PipelineState = {"raw_text": "??? xxx unreadable content ???"}
        result = intake_node(state)

        assert result["intake"] is not None
        assert result["intake"].is_garbled is True


class TestExtractionNode:
    @patch('app.ai.groq_client.groq_client')
    def test_extraction_returns_structured_data(self, mock_client):
        from app.ai.nodes import extraction_node, PipelineState

        mock_client.extraction.return_value = ExtractedDeviation(
            product_name="Aspirin 81mg",
            batch_lot_number="B12345",
            manufacturing_date=date(2026, 10, 1),
            detected_date=date(2026, 10, 5),
            site_block="Manufacturing",
            severity="Major",
            title="Foreign particles in tablets",
            description="Foreign particles found during visual inspection",
            raw_text="Batch B12345 Aspirin 81mg foreign particles",
            extraction_confidence=0.95,
            missing_fields=[]
        )

        state: PipelineState = {"raw_text": "Batch B12345 Aspirin 81mg foreign particles detected on Oct 5"}
        result = extraction_node(state)

        assert result["extraction"] is not None
        assert result["extraction"].product_name == "Aspirin 81mg"
        assert result["extraction"].batch_lot_number == "B12345"

    @patch('app.ai.groq_client.groq_client')
    def test_extraction_handles_missing_fields(self, mock_client):
        from app.ai.nodes import extraction_node, PipelineState

        mock_client.extraction.return_value = ExtractedDeviation(
            product_name=None,
            batch_lot_number=None,
            manufacturing_date=None,
            detected_date=None,
            site_block=None,
            severity=None,
            title="Unknown issue",
            description="Some description",
            raw_text="Vague text without details",
            extraction_confidence=0.3,
            missing_fields=["product_name", "batch_lot_number", "severity"]
        )

        state: PipelineState = {"raw_text": "Vague text without details"}
        result = extraction_node(state)

        assert result["extraction"] is not None
        assert result["extraction"].product_name is None
        assert "product_name" in result["extraction"].missing_fields


class TestEvidenceGapNode:
    @patch('app.ai.groq_client.groq_client')
    def test_evidence_gap_identifies_missing_info(self, mock_client):
        from app.ai.nodes import evidence_gap_node, PipelineState
        from app.ai.schemas import ExtractedDeviation

        mock_client.evidence_gap.return_value = EvidenceGap(
            missing_information=["Equipment maintenance logs", "Operator training records"],
            suggested_evidence_types=["Equipment log", "Training certification"],
            questions_to_investigate=["Was the equipment calibrated?"],
            risk_flags=["Potential regulatory non-compliance"]
        )

        extraction = ExtractedDeviation(
            product_name="Test Product",
            batch_lot_number="B001",
            manufacturing_date=None,
            detected_date=None,
            site_block="Manufacturing",
            severity="Critical",
            title="Test",
            description="Test",
            raw_text="Test",
            extraction_confidence=0.9,
            missing_fields=["manufacturing_date"]
        )

        state: PipelineState = {
            "raw_text": "Test",
            "extraction": extraction,
            "existing_evidence": []
        }
        result = evidence_gap_node(state)

        assert result["evidence_gap"] is not None
        assert len(result["evidence_gap"].missing_information) > 0
        assert len(result["evidence_gap"].risk_flags) > 0


class TestRCANode:
    @patch('app.ai.groq_client.groq_client')
    def test_rca_with_five_whys_method(self, mock_client):
        from app.ai.nodes import rca_node, PipelineState
        from app.ai.schemas import ExtractedDeviation

        mock_client.rca_analysis.return_value = RCAResult(
            method_used="five_whys",
            root_cause_proposals=[
                RootCauseProposal(
                    cause_type="Faulty temperature sensor",
                    is_primary=True,
                    ai_rationale="Sensor drifted over time",
                    supporting_evidence_ids=[1],
                    confidence_score=0.85,
                    confidence_label="High"
                )
            ],
            confidence_summary="High confidence based on temperature logs",
            evidence_support_notes="Temperature logs show 5 degree variance",
            limitations="Analysis based on limited data from single batch"
        )

        extraction = ExtractedDeviation(
            product_name="Test",
            batch_lot_number="B001",
            manufacturing_date=date(2026, 10, 1),
            detected_date=date(2026, 10, 5),
            site_block="Manufacturing",
            severity="Major",
            title="Temperature excursion",
            description="High temperature during processing",
            raw_text="Test",
            extraction_confidence=0.9,
            missing_fields=[]
        )

        state: PipelineState = {
            "raw_text": "Test",
            "extraction": extraction,
            "existing_evidence": []
        }
        result = rca_node(state)

        assert result["rca"] is not None
        assert result["rca"].method_used == "five_whys"
        assert result["rca"].root_cause_proposals[0].cause_type == "Faulty temperature sensor"

    @patch('app.ai.groq_client.groq_client')
    def test_rca_uses_fishbone_for_critical(self, mock_client):
        from app.ai.nodes import rca_node, PipelineState
        from app.ai.schemas import ExtractedDeviation, RootCauseProposal

        mock_client.rca_analysis.return_value = RCAResult(
            method_used="fishbone",
            root_cause_proposals=[
                RootCauseProposal(
                    cause_type="Calibration procedure not followed",
                    is_primary=True,
                    ai_rationale="Procedure skipped during shift change",
                    supporting_evidence_ids=[],
                    confidence_score=0.75,
                    confidence_label="Medium"
                )
            ],
            confidence_summary="Medium confidence based on interviews",
            evidence_support_notes="Interview notes indicate calibration skipped",
            limitations="Limited equipment data available"
        )

        extraction = ExtractedDeviation(
            product_name="Test",
            batch_lot_number="B001",
            manufacturing_date=date(2026, 10, 1),
            detected_date=date(2026, 10, 5),
            site_block="QC Lab",
            severity="Critical",
            title="Critical OOS result",
            description="Out of specification result",
            raw_text="Test",
            extraction_confidence=0.95,
            missing_fields=[]
        )

        state: PipelineState = {
            "raw_text": "Test",
            "extraction": extraction,
            "existing_evidence": []
        }
        result = rca_node(state)

        assert result["rca"] is not None
        assert result["rca"].method_used == "fishbone"


class TestCAPANode:
    @patch('app.ai.groq_client.groq_client')
    def test_capa_proposes_corrective_and_preventive(self, mock_client):
        from app.ai.nodes import capa_node, PipelineState
        from app.ai.schemas import ExtractedDeviation, RCAResult

        mock_client.capa_proposal.return_value = CAPAResult(
            proposed_capas=[
                ProposedCAPA(
                    action_type="Corrective",
                    description="Replace faulty sensor immediately",
                    rationale="Root cause is the sensor",
                    owner="Maintenance",
                    priority="High",
                    estimated_effort="2 hours"
                ),
                ProposedCAPA(
                    action_type="Preventive",
                    description="Implement monthly sensor calibration checks",
                    rationale="Prevent recurrence",
                    owner="Quality",
                    priority="Medium",
                    estimated_effort="1 day"
                )
            ],
            immediate_actions=["Isolate affected batch", "Alert production team"],
            long_term_improvements=["Update calibration SOP", "Add automated monitoring alerts"]
        )

        extraction = ExtractedDeviation(
            product_name="Test",
            batch_lot_number="B001",
            manufacturing_date=date(2026, 10, 1),
            detected_date=date(2026, 10, 5),
            site_block="Manufacturing",
            severity="Major",
            title="Test",
            description="Test",
            raw_text="Test",
            extraction_confidence=0.9,
            missing_fields=[]
        )

        rca = RCAResult(
            method_used="five_whys",
            root_cause_proposals=[
                RootCauseProposal(
                    cause_type="Faulty sensor",
                    is_primary=True,
                    ai_rationale="Sensor drift",
                    supporting_evidence_ids=[1],
                    confidence_score=0.85,
                    confidence_label="High"
                )
            ],
            confidence_summary="High confidence",
            evidence_support_notes="Logs show sensor drift",
            limitations=""
        )

        state: PipelineState = {
            "raw_text": "Test",
            "extraction": extraction,
            "rca": rca,
            "existing_evidence": []
        }
        result = capa_node(state)

        assert result["capa"] is not None
        assert len(result["capa"].proposed_capas) == 2
        assert any(capa.action_type == "Corrective" for capa in result["capa"].proposed_capas)
        assert any(capa.action_type == "Preventive" for capa in result["capa"].proposed_capas)


class TestPipelineIntegration:
    @patch('app.ai.groq_client.groq_client')
    def test_full_pipeline_runs_all_nodes(self, mock_client):
        from app.ai.graph import run_full_pipeline

        mock_client.extraction.return_value = ExtractedDeviation(
            product_name="Product X",
            batch_lot_number="B999",
            manufacturing_date=date(2026, 10, 1),
            detected_date=date(2026, 10, 5),
            site_block="Packaging",
            severity="Major",
            title="Seal failure",
            description="Container seal failed during packaging",
            raw_text="Batch B999 Product X seal failure detected",
            extraction_confidence=0.92,
            missing_fields=[]
        )

        mock_client.evidence_gap.return_value = EvidenceGap(
            missing_information=["Seal equipment maintenance log"],
            suggested_evidence_types=["Equipment log", "Environmental records"],
            questions_to_investigate=["Was seal temperature correct?"],
            risk_flags=[]
        )

        mock_client.rca_analysis.return_value = RCAResult(
            method_used="five_whys",
            root_cause_proposals=[
                RootCauseProposal(
                    cause_type="Seal temperature too low",
                    is_primary=True,
                    ai_rationale="Temperature controller drift",
                    supporting_evidence_ids=[1],
                    confidence_score=0.88,
                    confidence_label="High"
                )
            ],
            confidence_summary="High confidence",
            evidence_support_notes="Temperature log confirms 5C below setpoint",
            limitations="No visual inspection records"
        )

        mock_client.capa_proposal.return_value = CAPAResult(
            proposed_capas=[
                ProposedCAPA(
                    action_type="Corrective",
                    description="Recalibrate temperature controller",
                    rationale="Root cause is temperature deviation",
                    owner="Maintenance",
                    priority="High",
                    estimated_effort="30 minutes"
                )
            ],
            immediate_actions=[],
            long_term_improvements=["Add temperature deviation alert"]
        )

        result = run_full_pipeline(
            raw_text="Batch B999 Product X seal failure detected on Oct 5",
            deviation_id=None,
            existing_evidence=[]
        )

        assert result["all_nodes_completed"] is True
        assert result["extraction"] is not None
        assert result["extraction"].product_name == "Product X"
        assert result["rca"] is not None
        assert result["rca"].root_cause_proposals[0].cause_type == "Seal temperature too low"
        assert result["capa"] is not None
        assert len(result["capa"].proposed_capas) > 0


class TestGroqClientWrapper:
    def test_client_uses_primary_model(self):
        from app.ai.groq_client import GroqClient

        client = GroqClient(api_key="test-key", model="llama-3.3-70b-versatile")
        assert client.primary_model == "llama-3.3-70b-versatile"
        assert client.fallback_model == "gemma2-9b-it"

    @patch('app.ai.groq_client.Groq')
    def test_client_calls_groq_api(self, mock_groq_class):
        from app.ai.groq_client import GroqClient
        from app.ai.schemas import ExtractedDeviation
        from unittest.mock import MagicMock

        mock_client = MagicMock()
        mock_groq_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"product_name": "Test", "batch_lot_number": "B123", "manufacturing_date": null, "detected_date": null, "site_block": null, "severity": null, "title": "Test", "description": "Test desc", "raw_text": "Test", "extraction_confidence": 0.8, "missing_fields": []}'
        mock_client.chat.completions.create.return_value = mock_response

        client = GroqClient(api_key="test-key")
        result = client.extraction("Test text")

        mock_client.chat.completions.create.assert_called_once()
        call_kwargs = mock_client.chat.completions.create.call_args
        assert call_kwargs.kwargs["model"] == "llama-3.3-70b-versatile"
        assert call_kwargs.kwargs["response_format"]["type"] == "json_object"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])