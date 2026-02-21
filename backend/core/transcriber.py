import asyncio
import os
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
import numpy as np

@dataclass
class TranscriptionSegment:
    text: str
    start: float
    end: float

@dataclass
class TranscriptionResult:
    segments: list[TranscriptionSegment]
    full_text: str
    duration: float

class ParakeetTranscriber:
    """Wrapper for parakeet-mlx with async support."""

    MODEL_ID = "mlx-community/parakeet-tdt-0.6b-v2"

    def __init__(self):
        self._model = None
        self._get_logmel = None
        self._mx = None
        self._is_loaded = False
        self._lock = asyncio.Lock()
        self._cache_dir = self._default_cache_dir()

    def _default_cache_dir(self) -> str:
        return str(Path.home() / "VoiceOverlay" / "model-cache")

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    def is_model_downloaded(self) -> bool:
        """Check if model files exist locally."""
        try:
            from huggingface_hub import hf_hub_download
            # Try to find model locally
            hf_hub_download(
                self.MODEL_ID,
                "config.json",
                cache_dir=self._cache_dir,
                local_files_only=True
            )
            return True
        except Exception:
            return False

    async def load_model(self, cache_dir: Optional[str] = None) -> None:
        """Load the parakeet model."""
        async with self._lock:
            if self._is_loaded:
                return

            if cache_dir:
                self._cache_dir = cache_dir

            loop = asyncio.get_event_loop()

            def _load():
                try:
                    from parakeet_mlx import from_pretrained
                    from parakeet_mlx.audio import get_logmel
                    import mlx.core as mx
                    model = from_pretrained(self.MODEL_ID)
                    return model, get_logmel, mx
                except ImportError:
                    # Fallback for development without parakeet-mlx
                    print("Warning: parakeet-mlx not installed, using mock transcriber")
                    return None, None, None

            self._model, self._get_logmel, self._mx = await loop.run_in_executor(None, _load)
            self._is_loaded = True

    async def transcribe_audio(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000
    ) -> TranscriptionResult:
        """Transcribe audio data."""
        if not self._is_loaded:
            raise RuntimeError("Model not loaded")

        if self._model is None:
            # Mock transcription for development
            return TranscriptionResult(
                segments=[TranscriptionSegment(
                    text="[Mock transcription - parakeet-mlx not installed]",
                    start=0.0,
                    end=1.0
                )],
                full_text="[Mock transcription - parakeet-mlx not installed]",
                duration=1.0
            )

        loop = asyncio.get_event_loop()

        def _transcribe():
            # Ensure audio is the right format
            if audio_data.dtype != np.float32:
                audio = audio_data.astype(np.float32)
            else:
                audio = audio_data

            # Normalize if needed
            if np.abs(audio).max() > 1.0:
                audio = audio / np.abs(audio).max()

            # Convert to MLX array and generate mel-spectrogram
            audio_mx = self._mx.array(audio, dtype=self._mx.float32)
            mel = self._get_logmel(audio_mx, self._model.preprocessor_config)

            # Use generate() for numpy array input
            result = self._model.generate(mel)[0]
            return result

        result = await loop.run_in_executor(None, _transcribe)

        # Convert to our format - result is an AlignedResult object
        duration = len(audio_data) / sample_rate
        segments = []

        # Extract text from AlignedResult
        if hasattr(result, 'text'):
            full_text = result.text
        else:
            full_text = str(result)

        # Extract segments from sentences if available
        if hasattr(result, 'sentences') and result.sentences:
            for sentence in result.sentences:
                seg_text = sentence.text if hasattr(sentence, 'text') else str(sentence)
                # Get start/end from tokens if available
                seg_start = 0.0
                seg_end = duration
                if hasattr(sentence, 'tokens') and sentence.tokens:
                    first_token = sentence.tokens[0]
                    last_token = sentence.tokens[-1]
                    seg_start = first_token.start if hasattr(first_token, 'start') else 0.0
                    seg_end = last_token.end if hasattr(last_token, 'end') else duration
                segments.append(TranscriptionSegment(
                    text=seg_text.strip(),
                    start=seg_start,
                    end=seg_end
                ))
        elif hasattr(result, 'tokens') and result.tokens:
            # Group tokens into segments by pauses or punctuation
            current_segment_tokens = []
            for token in result.tokens:
                current_segment_tokens.append(token)
                token_text = token.text if hasattr(token, 'text') else str(token)
                # Create segment at sentence boundaries
                if token_text.strip().endswith(('.', '?', '!')):
                    if current_segment_tokens:
                        first = current_segment_tokens[0]
                        last = current_segment_tokens[-1]
                        seg_text = ''.join(t.text if hasattr(t, 'text') else str(t) for t in current_segment_tokens)
                        segments.append(TranscriptionSegment(
                            text=seg_text.strip(),
                            start=first.start if hasattr(first, 'start') else 0.0,
                            end=last.end if hasattr(last, 'end') else duration
                        ))
                        current_segment_tokens = []
            # Add remaining tokens
            if current_segment_tokens:
                first = current_segment_tokens[0]
                last = current_segment_tokens[-1]
                seg_text = ''.join(t.text if hasattr(t, 'text') else str(t) for t in current_segment_tokens)
                segments.append(TranscriptionSegment(
                    text=seg_text.strip(),
                    start=first.start if hasattr(first, 'start') else 0.0,
                    end=last.end if hasattr(last, 'end') else duration
                ))

        # Fallback if no segments were created
        if not segments:
            segments = [TranscriptionSegment(
                text=full_text,
                start=0.0,
                end=duration
            )]

        return TranscriptionResult(
            segments=segments,
            full_text=full_text,
            duration=duration
        )

    def get_model_info(self) -> dict:
        """Get information about the model."""
        return {
            "model_id": self.MODEL_ID,
            "is_loaded": self._is_loaded,
            "cache_dir": self._cache_dir
        }


# Singleton instance
transcriber = ParakeetTranscriber()
