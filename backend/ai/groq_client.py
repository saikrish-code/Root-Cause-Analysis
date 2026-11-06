import os
from typing import Type, TypeVar, Generic, Optional
from groq import Groq, RateLimitError, APIError
from pydantic import BaseModel
from app.core.config import settings

T = TypeVar("T", bound=BaseModel)


class GroqClient:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.primary_model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.fallback_model = "gemma2-9b-it"
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = Groq(api_key=self.api_key)
        return self._client

    def _call_groq(
        self,
        messages: list,
        response_schema: Type[T],
        temperature: float = 0.1
    ) -> T:
        system_prompt = f"""You are a pharmaceutical Quality Root Cause Analysis assistant.
You must output STRICT JSON matching the required schema. 
Do not invent information not present in the source text.
If a field cannot be determined, use null and include it in missing_fields.
Always output valid JSON only, no markdown, no explanations."""

        full_messages = [
            {"role": "system", "content": system_prompt},
            *messages
        ]

        try:
            response = self.client.chat.completions.create(
                model=self.primary_model,
                messages=full_messages,
                temperature=temperature,
                response_format={"type": "json_object"},
                max_tokens=4000
            )
            content = response.choices[0].message.content
            return response_schema.model_validate_json(content)
        except RateLimitError:
            try:
                response = self.client.chat.completions.create(
                    model=self.fallback_model,
                    messages=full_messages,
                    temperature=temperature,
                    response_format={"type": "json_object"},
                    max_tokens=4000
                )
                content = response.choices[0].message.content
                return response_schema.model_validate_json(content)
            except APIError as e:
                raise RuntimeError(f"Groq API error with fallback model: {e}")
        except APIError as e:
            raise RuntimeError(f"Groq API error: {e}")

    def extraction(self, raw_text: str) -> "ExtractedDeviation":
        from ai.schemas import ExtractedDeviation
        user_message = {
            "role": "user",
            "content": f"Extract deviation information from this source text:\n\n{raw_text}"
        }
        return self._call_groq([user_message], ExtractedDeviation)

    def evidence_gap(self, extraction: "ExtractedDeviation", existing_evidence: list) -> "EvidenceGap":
        from ai.schemas import EvidenceGap
        context = {
            "extracted": extraction.model_dump(),
            "existing_evidence": existing_evidence or []
        }
        user_message = {
            "role": "user",
            "content": f"Identify missing evidence gaps based on:\n\n{context}"
        }
        return self._call_groq([user_message], EvidenceGap)

    def rca_analysis(self, extraction: "ExtractedDeviation", evidence: list, method: str = "five_whys") -> "RCAResult":
        from ai.schemas import RCAResult
        context = {
            "extraction": extraction.model_dump(),
            "evidence": evidence or [],
            "method": method
        }
        user_message = {
            "role": "user",
            "content": f"Perform {method} root cause analysis:\n\n{context}"
        }
        return self._call_groq([user_message], RCAResult)

    def capa_proposal(self, extraction: "ExtractedDeviation", rca: "RCAResult") -> "CAPAResult":
        from ai.schemas import CAPAResult
        context = {
            "extraction": extraction.model_dump(),
            "rca": rca.model_dump()
        }
        user_message = {
            "role": "user",
            "content": f"Propose CAPA actions based on:\n\n{context}"
        }
        return self._call_groq([user_message], CAPAResult)


groq_client = GroqClient()