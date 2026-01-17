import asyncio
import time
from pathlib import Path
from typing import AsyncGenerator

class ModelManager:
    """Manages model downloading with progress tracking."""

    MODEL_REPO = "mlx-community/parakeet-tdt-0.6b-v2"
    MODEL_FILES = [
        "config.json",
        "model.safetensors",
        "preprocessor_config.json",
        "tokenizer.json"
    ]

    def __init__(self):
        self._cache_dir = self._default_cache_dir()

    def _default_cache_dir(self) -> str:
        return str(Path.home() / "VoiceNotes" / "model-cache")

    def get_estimated_size(self) -> int:
        """Get estimated total model size in bytes."""
        return 640 * 1024 * 1024  # ~640MB

    async def download_model(self) -> AsyncGenerator[dict, None]:
        """Download model files with progress updates."""
        from huggingface_hub import hf_hub_download, HfApi

        # Ensure cache directory exists
        Path(self._cache_dir).mkdir(parents=True, exist_ok=True)

        total_size = self.get_estimated_size()
        downloaded = 0
        start_time = time.time()

        api = HfApi()

        for filename in self.MODEL_FILES:
            try:
                # Get file info
                try:
                    model_info = api.model_info(self.MODEL_REPO)
                    file_info = next(
                        (s for s in model_info.siblings if s.rfilename == filename),
                        None
                    )
                    file_size = file_info.size if file_info and file_info.size else 0
                except:
                    file_size = 0

                # Download file
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda f=filename: hf_hub_download(
                        self.MODEL_REPO,
                        f,
                        cache_dir=self._cache_dir
                    )
                )

                downloaded += file_size if file_size else (total_size // len(self.MODEL_FILES))
                elapsed = time.time() - start_time
                speed = downloaded / elapsed if elapsed > 0 else 0
                remaining = total_size - downloaded
                eta = remaining / speed if speed > 0 else 0

                yield {
                    "status": "downloading",
                    "file": filename,
                    "downloaded_bytes": downloaded,
                    "total_bytes": total_size,
                    "percent": min(100, (downloaded / total_size) * 100),
                    "speed_mbps": speed / (1024 * 1024),
                    "eta_seconds": eta
                }

            except Exception as e:
                yield {
                    "status": "error",
                    "file": filename,
                    "message": str(e)
                }
                return

        yield {
            "status": "complete",
            "downloaded_bytes": total_size,
            "total_bytes": total_size,
            "percent": 100
        }


# Singleton instance
model_manager = ModelManager()
