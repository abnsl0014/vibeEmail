import json
import asyncio
from typing import Optional
from pathlib import Path

MODEL_NAME = "mlx-community/Llama-3.2-1B-Instruct-4bit"
CACHE_DIR = str(Path.home() / "VoiceOverlay" / "model-cache")

_mlx_lm = None
_model = None
_tokenizer = None


class IntentService:
    MODEL_NAME = MODEL_NAME

    def __init__(self):
        self._loaded = False
        self._loading = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def is_model_downloaded(self) -> bool:
        try:
            from huggingface_hub import hf_hub_download

            hf_hub_download(
                MODEL_NAME,
                "config.json",
                cache_dir=CACHE_DIR,
                local_files_only=True,
            )
            return True
        except Exception:
            return False

    async def load_model(self):
        global _mlx_lm, _model, _tokenizer
        if self._loaded:
            return
        if self._loading:
            while self._loading:
                await asyncio.sleep(0.5)
            return

        self._loading = True
        try:
            if _mlx_lm is None:
                import mlx_lm

                _mlx_lm = mlx_lm
            _model, _tokenizer = _mlx_lm.load(MODEL_NAME)
            self._loaded = True
        except ImportError:
            print("mlx-lm not available, using mock mode")
            self._loaded = True
        except Exception as e:
            raise e
        finally:
            self._loading = False

    async def parse_intent(self, text: str) -> dict:
        global _model

        if _model is None:
            return self._mock_parse(text)

        prompt = (
            "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
            "You parse voice commands into structured intents. "
            "Given a transcribed voice command, extract the intent as JSON.\n\n"
            "Output ONLY valid JSON in this format:\n"
            '{"action": "email", "to": "recipient name", '
            '"subject": "email subject", "body_hint": "key points", '
            '"confidence": 0.95}\n\n'
            "If the command is not about email, set action to \"unknown\"."
            "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
            f"{text}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        )

        loop = asyncio.get_event_loop()

        def _generate():
            from mlx_lm.sample_utils import make_sampler

            sampler = make_sampler(temp=0.2)
            return _mlx_lm.generate(
                _model, _tokenizer, prompt=prompt, max_tokens=256, sampler=sampler
            )

        response = await loop.run_in_executor(None, _generate)
        return self._parse_json_response(response, text)

    def _mock_parse(self, text: str) -> dict:
        text_lower = text.lower()
        if any(w in text_lower for w in ["email", "send", "mail", "write to", "message"]):
            to = ""
            import re
            # Try multiple patterns to find recipient name
            # "send mail/email to <name>"
            match = re.search(r'(?:send\s+(?:mail|email|message)\s+to)\s+(\w+)', text_lower)
            if not match:
                # "email <name> about ..."
                match = re.search(r'(?:email|write to|message)\s+(\w+)', text_lower)
            if not match:
                # fallback: "to <name>"
                match = re.search(r'\bto\s+(\w+)', text_lower)
            if match:
                to = match.group(1).capitalize()
                if to.lower() in ["about", "regarding", "the", "a", "an", "my", "our", "mail", "email"]:
                    # Try next word
                    remaining = text_lower[match.end():].strip()
                    next_match = re.match(r'(?:to\s+)?(\w+)', remaining)
                    if next_match and next_match.group(1) not in ["about", "regarding", "the", "a", "an"]:
                        to = next_match.group(1).capitalize()
                    else:
                        to = ""

            subject_hint = ""
            for trigger in ["about ", "regarding ", "re "]:
                if trigger in text_lower:
                    idx = text_lower.index(trigger) + len(trigger)
                    subject_hint = text[idx:].strip()[:80]
                    break

            return {
                "action": "email",
                "to": to or "recipient",
                "subject": subject_hint or text[:50],
                "body_hint": text,
                "confidence": 0.85,
            }
        return {
            "action": "unknown",
            "to": None,
            "subject": None,
            "body_hint": text,
            "confidence": 0.3,
        }

    def _parse_json_response(self, response: str, original_text: str) -> dict:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                parsed = json.loads(response[start:end])
                return {
                    "action": parsed.get("action", "unknown"),
                    "to": parsed.get("to"),
                    "subject": parsed.get("subject"),
                    "body_hint": parsed.get("body_hint"),
                    "confidence": parsed.get("confidence", 0.5),
                }
        except json.JSONDecodeError:
            pass
        return self._mock_parse(original_text)


_intent_service: Optional[IntentService] = None


def get_intent_service() -> IntentService:
    global _intent_service
    if _intent_service is None:
        _intent_service = IntentService()
    return _intent_service
