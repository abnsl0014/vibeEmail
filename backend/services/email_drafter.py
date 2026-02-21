import json
import asyncio
from typing import Optional


class EmailDrafter:
    async def draft_email(self, to: str, subject: str, body_hint: str) -> dict:
        from services.intent_service import _mlx_lm, _model, _tokenizer

        if _model is None:
            return self._mock_draft(to, subject, body_hint)

        prompt = (
            "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
            "You are an email composer. Given the recipient, subject hint, and body hint, "
            "write a professional, concise email.\n\n"
            "Output ONLY valid JSON in this format:\n"
            '{"subject": "final subject line", "body": "full email body text"}\n\n'
            "Keep the email brief and professional."
            "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
            f"To: {to}\nSubject hint: {subject}\nBody hint: {body_hint}"
            "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        )

        loop = asyncio.get_event_loop()

        def _generate():
            from mlx_lm.sample_utils import make_sampler

            sampler = make_sampler(temp=0.5)
            return _mlx_lm.generate(
                _model, _tokenizer, prompt=prompt, max_tokens=512, sampler=sampler
            )

        response = await loop.run_in_executor(None, _generate)
        return self._parse_draft(response, to, subject, body_hint)

    def _mock_draft(self, to: str, subject: str, body_hint: str) -> dict:
        if not subject:
            subject = "Following up"

        body = f"Hi {to},\n\n"
        if body_hint:
            body += f"{body_hint}\n\n"
        else:
            body += "I wanted to follow up on our previous conversation.\n\n"
        body += "Best regards"

        return {"to": to, "subject": subject, "body": body}

    def _parse_draft(
        self, response: str, to: str, subject: str, body_hint: str
    ) -> dict:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                parsed = json.loads(response[start:end])
                return {
                    "to": to,
                    "subject": parsed.get("subject", subject),
                    "body": parsed.get("body", body_hint),
                }
        except json.JSONDecodeError:
            pass
        return self._mock_draft(to, subject, body_hint)


_email_drafter: Optional[EmailDrafter] = None


def get_email_drafter() -> EmailDrafter:
    global _email_drafter
    if _email_drafter is None:
        _email_drafter = EmailDrafter()
    return _email_drafter
