from pathlib import Path
from typing import Self

from pydantic import BaseModel, ConfigDict, Field

ENV_MAP = {
    "web_url": "AGENT_QA_WEB_URL",
    "hocuspocus_url": "AGENT_QA_HOCUSPOCUS_URL",
    "fastify_url": "AGENT_QA_FASTIFY_URL",
    "postgres_dsn": "AGENT_QA_POSTGRES_DSN",
    "rag_url": "AGENT_QA_RAG_URL",
    "ollama_url": "AGENT_QA_OLLAMA_URL",
    "evidence_root": "AGENT_QA_EVIDENCE_ROOT",
    "planner_model": "AGENT_QA_PLANNER_MODEL",
    "driver_model": "AGENT_QA_DRIVER_MODEL",
    "critic_model": "AGENT_QA_CRITIC_MODEL",
    "anthropic_api_key": "ANTHROPIC_API_KEY",
    "log_level": "AGENT_QA_LOG_LEVEL",
}


try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:

    class Settings(BaseModel):
        model_config = ConfigDict(extra="ignore", populate_by_name=True)

        web_url: str = "http://localhost:18120"
        hocuspocus_url: str = "http://localhost:18121"
        fastify_url: str = "http://localhost:18122"
        postgres_dsn: str = "postgres://highport:highport@localhost:18123/highport"
        rag_url: str = "http://localhost:18124"
        ollama_url: str = "http://localhost:11434"
        evidence_root: Path = Path(".sisyphus/evidence/agent-qa")
        planner_model: str = "claude-haiku-4-5"
        driver_model: str = "claude-sonnet-4-5"
        critic_model: str = "claude-sonnet-4-5"
        anthropic_api_key: str | None = Field(default=None, validation_alias="ANTHROPIC_API_KEY")
        log_level: str = "INFO"

        @classmethod
        def from_env(cls) -> Self:
            try:
                from dotenv import load_dotenv
            except ImportError:
                load_dotenv = None
            if load_dotenv is not None:
                _ = load_dotenv()

            import os

            values: dict[str, object] = {}
            for field, env in ENV_MAP.items():
                value = os.environ.get(env)
                if value:
                    values[field] = Path(value) if field == "evidence_root" else value
            return cls.model_validate(values)

else:

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=".env", env_prefix="AGENT_QA_", extra="ignore", populate_by_name=True
        )

        web_url: str = "http://localhost:18120"
        hocuspocus_url: str = "http://localhost:18121"
        fastify_url: str = "http://localhost:18122"
        postgres_dsn: str = "postgres://highport:highport@localhost:18123/highport"
        rag_url: str = "http://localhost:18124"
        ollama_url: str = "http://localhost:11434"
        evidence_root: Path = Path(".sisyphus/evidence/agent-qa")
        planner_model: str = "claude-haiku-4-5"
        driver_model: str = "claude-sonnet-4-5"
        critic_model: str = "claude-sonnet-4-5"
        anthropic_api_key: str | None = Field(default=None, validation_alias="ANTHROPIC_API_KEY")
        log_level: str = "INFO"

        @classmethod
        def from_env(cls) -> Self:
            return cls()
