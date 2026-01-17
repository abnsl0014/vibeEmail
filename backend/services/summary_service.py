"""
AI Summary Service using MLX-LM for local inference on Apple Silicon.
Generates meeting summaries including overview, key points, and action items.
"""

import json
import asyncio
from datetime import datetime
from typing import Optional
from pathlib import Path

# MLX-LM will be imported lazily to avoid slow startup
_mlx_lm = None
_model = None
_tokenizer = None

MODEL_NAME = "mlx-community/Llama-3.2-1B-Instruct-4bit"

class SummaryService:
    """Service for generating AI summaries of meeting transcripts."""

    def __init__(self):
        self._model_loaded = False
        self._loading = False

    @property
    def is_loaded(self) -> bool:
        return self._model_loaded

    @property
    def is_loading(self) -> bool:
        return self._loading

    async def load_model(self) -> bool:
        """Load the LLM model for summary generation."""
        global _mlx_lm, _model, _tokenizer

        if self._model_loaded:
            return True

        if self._loading:
            # Wait for existing load to complete
            while self._loading:
                await asyncio.sleep(0.5)
            return self._model_loaded

        self._loading = True

        try:
            # Import MLX-LM lazily
            if _mlx_lm is None:
                import mlx_lm
                _mlx_lm = mlx_lm

            # Load model and tokenizer
            print(f"Loading summary model: {MODEL_NAME}")
            _model, _tokenizer = _mlx_lm.load(MODEL_NAME)

            self._model_loaded = True
            print("Summary model loaded successfully")
            return True

        except Exception as e:
            print(f"Failed to load summary model: {e}")
            self._model_loaded = False
            return False
        finally:
            self._loading = False

    async def generate_summary(self, transcript: str, title: str = "") -> Optional[dict]:
        """
        Generate a summary from a meeting transcript.

        Returns:
            dict with keys: overview, key_points, action_items, generated_at, model_used
        """
        global _mlx_lm, _model, _tokenizer

        if not self._model_loaded:
            loaded = await self.load_model()
            if not loaded:
                return None

        # Truncate transcript if too long (keep first ~4000 words)
        words = transcript.split()
        if len(words) > 4000:
            transcript = " ".join(words[:4000]) + "\n\n[Transcript truncated for processing...]"

        # Build the prompt
        prompt = self._build_prompt(transcript, title)

        try:
            # Generate response using MLX-LM
            # Create a sampler with temperature for consistent output
            from mlx_lm.sample_utils import make_sampler
            sampler = make_sampler(temp=0.3)

            response = _mlx_lm.generate(
                _model,
                _tokenizer,
                prompt=prompt,
                max_tokens=1024,
                sampler=sampler,
            )

            # Parse the response
            summary = self._parse_response(response)
            summary["generated_at"] = datetime.utcnow().isoformat()
            summary["model_used"] = MODEL_NAME

            return summary

        except Exception as e:
            print(f"Error generating summary: {e}")
            return None

    def _build_prompt(self, transcript: str, title: str) -> str:
        """Build the prompt for summary generation."""
        system_message = """You are an AI assistant that summarizes meeting transcripts.
Generate a structured summary with:
1. A brief overview (2-3 sentences)
2. Key points discussed (3-5 bullet points)
3. Action items with assignees if mentioned (list any tasks that need to be done)

Respond in JSON format with this exact structure:
{
    "overview": "Brief overview of the meeting",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "action_items": [
        {"task": "Description of task", "assignee": "Person name or null"}
    ]
}"""

        user_message = f"""Please summarize this meeting transcript{f' titled "{title}"' if title else ''}:

{transcript}

Respond with only the JSON summary, no additional text."""

        # Format for Llama 3.2 instruction format
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>

{system_message}<|eot_id|><|start_header_id|>user<|end_header_id|>

{user_message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

"""
        return prompt

    def _parse_response(self, response: str) -> dict:
        """Parse the LLM response into a structured summary."""
        # Try to extract JSON from the response
        try:
            # Find JSON in the response
            start_idx = response.find("{")
            end_idx = response.rfind("}") + 1

            if start_idx != -1 and end_idx > start_idx:
                json_str = response[start_idx:end_idx]
                parsed = json.loads(json_str)

                # Validate and normalize the structure
                return {
                    "overview": parsed.get("overview", ""),
                    "key_points": parsed.get("key_points", []),
                    "action_items": self._normalize_action_items(parsed.get("action_items", []))
                }
        except json.JSONDecodeError:
            pass

        # Fallback: try to extract content manually
        return self._fallback_parse(response)

    def _normalize_action_items(self, items: list) -> list:
        """Normalize action items to consistent format."""
        normalized = []
        for item in items:
            if isinstance(item, str):
                normalized.append({
                    "task": item,
                    "assignee": None,
                    "completed": False
                })
            elif isinstance(item, dict):
                normalized.append({
                    "task": item.get("task", str(item)),
                    "assignee": item.get("assignee"),
                    "completed": item.get("completed", False)
                })
        return normalized

    def _fallback_parse(self, response: str) -> dict:
        """Fallback parser when JSON extraction fails."""
        lines = response.strip().split("\n")

        overview = ""
        key_points = []
        action_items = []

        section = None
        for line in lines:
            line = line.strip()
            if not line:
                continue

            lower_line = line.lower()
            if "overview" in lower_line:
                section = "overview"
                continue
            elif "key point" in lower_line or "key_point" in lower_line:
                section = "key_points"
                continue
            elif "action" in lower_line:
                section = "action_items"
                continue

            if section == "overview":
                overview += line + " "
            elif section == "key_points":
                if line.startswith(("-", "*", "•")) or line[0].isdigit():
                    key_points.append(line.lstrip("-*•0123456789. "))
            elif section == "action_items":
                if line.startswith(("-", "*", "•", "[")) or line[0].isdigit():
                    action_items.append({
                        "task": line.lstrip("-*•[]0123456789. "),
                        "assignee": None,
                        "completed": False
                    })

        # If we couldn't parse sections, use the whole response as overview
        if not overview and not key_points:
            overview = response[:500] if len(response) > 500 else response

        return {
            "overview": overview.strip(),
            "key_points": key_points,
            "action_items": action_items
        }


# Singleton instance
_summary_service: Optional[SummaryService] = None

def get_summary_service() -> SummaryService:
    """Get the singleton SummaryService instance."""
    global _summary_service
    if _summary_service is None:
        _summary_service = SummaryService()
    return _summary_service
