import io
from typing import Optional

MIN_PDF_TEXT_LENGTH = 50


class PDFExtractionError(Exception):
    pass


class PDFTooShortError(PDFExtractionError):
    pass


def extract_text_from_pdf(file_content: bytes) -> str:
    text = ""
    use_pdfplumber = False

    try:
        import pdfplumber
        use_pdfplumber = True
    except ImportError:
        pass

    if use_pdfplumber:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    else:
        try:
            import fitz
            doc = fitz.open(stream=io.BytesIO(file_content), filetype="pdf")
            for page in doc:
                page_text = page.get_text()
                if page_text:
                    text += page_text + "\n"
            doc.close()
        except ImportError:
            pass

    if not text or len(text.strip()) < MIN_PDF_TEXT_LENGTH:
        raise PDFTooShortError(
            f"Couldn't read this PDF - extracted text is too short ({len(text.strip())} chars). "
            "Please paste the text directly."
        )

    return text


def extract_text(file_content: bytes, filename: str) -> str:
    if filename.lower().endswith(".pdf"):
        return extract_text_from_pdf(file_content)
    elif filename.lower().endswith(".txt"):
        return file_content.decode("utf-8", errors="replace")
    else:
        return file_content.decode("utf-8", errors="replace")