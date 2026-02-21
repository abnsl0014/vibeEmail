import asyncio
import time
from pathlib import Path
from typing import AsyncGenerator

ASR_MODEL = "mlx-community/parakeet-tdt-0.6b-v2"
LLM_MODEL = "mlx-community/Llama-3.2-1B-Instruct-4bit"


class ModelManager:
    def __init__(self):
        self._cache_dir = str(Path.home() / "VoiceOverlay" / "model-cache")

    async def download_all_models(self) -> AsyncGenerator[dict, None]:
        models = [
            {"name": "Parakeet TDT 0.6B (ASR)", "repo": ASR_MODEL, "size_mb": 2300},
            {"name": "Llama 3.2 1B Instruct (LLM)", "repo": LLM_MODEL, "size_mb": 680},
        ]
        total_size = sum(m["size_mb"] for m in models) * 1024 * 1024
        downloaded = 0
        start_time = time.time()

        for i, model_info in enumerate(models):
            try:
                yield {
                    "status": "downloading",
                    "model": model_info["name"],
                    "model_index": i + 1,
                    "model_count": len(models),
                    "percent": round((downloaded / total_size) * 100, 1),
                    "total_mb": round(total_size / (1024 * 1024)),
                }

                loop = asyncio.get_event_loop()
                repo = model_info["repo"]
                await loop.run_in_executor(None, lambda r=repo: self._download_model(r))

                downloaded += model_info["size_mb"] * 1024 * 1024
                elapsed = time.time() - start_time
                speed = downloaded / elapsed if elapsed > 0 else 0

                yield {
                    "status": "downloaded",
                    "model": model_info["name"],
                    "model_index": i + 1,
                    "model_count": len(models),
                    "downloaded_mb": round(downloaded / (1024 * 1024)),
                    "total_mb": round(total_size / (1024 * 1024)),
                    "percent": round((downloaded / total_size) * 100, 1),
                    "speed_mbps": round(speed / (1024 * 1024), 1),
                }
            except Exception as e:
                yield {
                    "status": "error",
                    "model": model_info["name"],
                    "message": str(e),
                }
                return

        yield {"status": "complete", "percent": 100}

    def _download_model(self, repo_id: str):
        try:
            from huggingface_hub import snapshot_download

            Path(self._cache_dir).mkdir(parents=True, exist_ok=True)
            snapshot_download(repo_id, cache_dir=self._cache_dir)
        except ImportError:
            print(f"huggingface_hub not available, skipping download of {repo_id}")


model_manager = ModelManager()
