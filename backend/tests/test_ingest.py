import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.ai.pdf_utils import PDFTooShortError


client = TestClient(app)


class TestPDFExtraction:
    def test_extract_text_from_pdf_with_pdfplumber(self):
        from app.ai.pdf_utils import extract_text

        mock_pdf_content = b"%PDF-1.4\nThis is a mock PDF with extracted text content."

        with patch('app.ai.pdf_utils.pdfplumber') as mock_pg:
            mock_page = MagicMock()
            mock_page.extract_text.return_value = "Extracted text from PDF"
            mock_pg.open.return_value.__enter__.return_value.pages = [mock_page]

            result = extract_text(mock_pdf_content, "test.pdf")
            assert "Extracted text from PDF" in result

    def test_extract_text_from_pdf_too_short_raises_error(self):
        from app.ai.pdf_utils import extract_text, MIN_PDF_TEXT_LENGTH

        mock_pdf_content = b"%PDF-1.4\nShort"

        with patch('app.ai.pdf_utils.pdfplumber') as mock_pg:
            mock_page = MagicMock()
            mock_page.extract_text.return_value = "Short"
            mock_pg.open.return_value.__enter__.return_value.pages = [mock_page]

            with pytest.raises(PDFTooShortError) as exc_info:
                extract_text(mock_pdf_content, "test.pdf")

            assert "too short" in str(exc_info.value).lower()

    def test_extract_text_from_txt_file(self):
        from app.ai.pdf_utils import extract_text

        txt_content = b"This is plain text content for testing"
        result = extract_text(txt_content, "test.txt")
        assert result == "This is plain text content for testing"

    def test_extract_text_from_unknown_extension(self):
        from app.ai.pdf_utils import extract_text

        content = b"Some content"
        result = extract_text(content, "test.unknown")
        assert result == "Some content"


class TestIngestEndpoint:
    @patch('app.ai.graph.run_full_pipeline')
    def test_ingest_with_raw_text(self, mock_pipeline):
        from app.ai.schemas import IntakeResult, ExtractedDeviation, EvidenceGap

        mock_pipeline.return_value = {
            "intake": IntakeResult(text_length=100, text_preview="...", text_type="email", is_garbled=False, language_detected="en"),
            "extraction": ExtractedDeviation(
                product_name="Test",
                batch_lot_number="B123",
                manufacturing_date=None,
                detected_date=None,
                site_block=None,
                severity=None,
                title="Test",
                description="Test",
                raw_text="Test",
                extraction_confidence=0.8,
                missing_fields=[]
            ),
            "evidence_gap": EvidenceGap(missing_information=[], suggested_evidence_types=[], questions_to_investigate=[], risk_flags=[]),
            "rca": None,
            "capa": None,
            "all_nodes_completed": True,
            "errors": None
        }

        response = client.post(
            "/api/ai/ingest",
            data={"raw_text": "Batch B123 deviation detected in Manufacturing"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["extraction"]["product_name"] == "Test"
        assert data["all_nodes_completed"] is True

    @patch('app.ai.graph.run_full_pipeline')
    def test_ingest_with_empty_raw_text_returns_error(self):
        response = client.post(
            "/api/ai/ingest",
            data={"raw_text": ""}
        )
        assert response.status_code == 400
        assert "too short or empty" in response.json()["detail"]

    def test_ingest_with_no_content_returns_error(self):
        response = client.post("/api/ai/ingest", data={})
        assert response.status_code == 400
        assert "Either raw_text or file must be provided" in response.json()["detail"]

    @patch('app.ai.graph.run_full_pipeline')
    @patch('app.ai.pdf_utils.extract_text')
    def test_ingest_with_pdf_file(self, mock_extract_text, mock_pipeline):
        from app.ai.schemas import IntakeResult, ExtractedDeviation, EvidenceGap

        mock_extract_text.return_value = "Extracted PDF text about Batch A456 quality issue"
        mock_pipeline.return_value = {
            "intake": IntakeResult(text_length=200, text_preview="...", text_type="pdf", is_garbled=False, language_detected="en"),
            "extraction": ExtractedDeviation(
                product_name="Product X",
                batch_lot_number="A456",
                manufacturing_date=None,
                detected_date=None,
                site_block="QC Lab",
                severity="Critical",
                title="Quality issue in batch A456",
                description="OOS result detected",
                raw_text="Test",
                extraction_confidence=0.9,
                missing_fields=[]
            ),
            "evidence_gap": EvidenceGap(missing_information=[], suggested_evidence_types=[], questions_to_investigate=[], risk_flags=[]),
            "rca": None,
            "capa": None,
            "all_nodes_completed": True,
            "errors": None
        }

        response = client.post(
            "/api/ai/ingest",
            files={"file": ("deviation.pdf", b"fake pdf content", "application/pdf")},
            data={"deviation_id": "1"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["extraction"]["product_name"] == "Product X"
        assert data["extraction"]["severity"] == "Critical"

    @patch('app.ai.pdf_utils.extract_text')
    def test_ingest_with_garbled_pdf_returns_error(self, mock_extract_text):
        mock_extract_text.side_effect = PDFTooShortError("Couldn't read this PDF")

        response = client.post(
            "/api/ai/ingest",
            files={"file": ("bad.pdf", b"fake pdf content", "application/pdf")}
        )

        assert response.status_code == 400
        assert "Couldn't read this PDF" in response.json()["detail"]

    @patch('app.ai.graph.run_full_pipeline')
    def test_ingest_returns_same_shape_as_process(self, mock_pipeline):
        from app.ai.schemas import IntakeResult, ExtractedDeviation, EvidenceGap

        mock_pipeline.return_value = {
            "intake": IntakeResult(text_length=100, text_preview="...", text_type="email", is_garbled=False, language_detected="en"),
            "extraction": ExtractedDeviation(
                product_name="Test",
                batch_lot_number="B999",
                manufacturing_date=None,
                detected_date=None,
                site_block="Warehouse",
                severity="Major",
                title="Test",
                description="Test",
                raw_text="Test",
                extraction_confidence=0.85,
                missing_fields=[]
            ),
            "evidence_gap": EvidenceGap(missing_information=[], suggested_evidence_types=[], questions_to_investigate=[], risk_flags=[]),
            "rca": None,
            "capa": None,
            "all_nodes_completed": True,
            "errors": None
        }

        ingest_response = client.post(
            "/api/ai/ingest",
            data={"raw_text": "Test deviation text"}
        )

        assert ingest_response.status_code == 200

        process_response = client.post(
            "/api/ai/process",
            json={"raw_text": "Test deviation text"}
        )

        assert process_response.status_code == 200
        assert list(ingest_response.json().keys()) == list(process_response.json().keys())
        assert ingest_response.json()["extraction"]["product_name"] == process_response.json()["extraction"]["product_name"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])