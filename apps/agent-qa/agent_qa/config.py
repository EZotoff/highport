from pathlib import Path
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

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
    "llm_model": "AGENT_QA_LLM_MODEL",
    "llm_provider_pref": "AGENT_QA_LLM_PROVIDER_PREF",
    "test_user_email_fmt": "AGENT_QA_TEST_USER_EMAIL_FMT",
    "test_user_password": "AGENT_QA_TEST_USER_PASSWORD",
    "test_user_roles": "AGENT_QA_TEST_USER_ROLES",
    "browser_user_data_root": "AGENT_QA_BROWSER_USER_DATA_ROOT",
    "anthropic_api_key": "ANTHROPIC_API_KEY",
    "log_level": "AGENT_QA_LOG_LEVEL",
}


def _default_browser_user_data_root(evidence_root: Path) -> Path:
    return evidence_root.parent / "browser-profiles"


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
        llm_model: str = "gemini-2.5-flash"
        llm_provider_pref: str = "auto"
        test_user_email_fmt: str = "{role}@agent-qa.test"
        test_user_password: str = "agent-qa-test-1234"
        test_user_roles: tuple[str, ...] = ("player1", "player2", "gm")
        browser_user_data_root: Path | None = None
        anthropic_api_key: str | None = Field(default=None, validation_alias="ANTHROPIC_API_KEY")
        log_level: str = "INFO"

        @model_validator(mode="after")
        def populate_derived_paths(self) -> Self:
            if self.browser_user_data_root is None:
                self.browser_user_data_root = _default_browser_user_data_root(self.evidence_root)
            return self

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
                    if field in {"evidence_root", "browser_user_data_root"}:
                        values[field] = Path(value)
                    elif field == "test_user_roles":
                        values[field] = tuple(
                            role.strip() for role in value.split(",") if role.strip()
                        )
                    else:
                        values[field] = value
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
        llm_model: str = "gemini-2.5-flash"
        llm_provider_pref: str = "auto"
        test_user_email_fmt: str = "{role}@agent-qa.test"
        test_user_password: str = "agent-qa-test-1234"
        test_user_roles: tuple[str, ...] = ("player1", "player2", "gm")
        browser_user_data_root: Path | None = None
        anthropic_api_key: str | None = Field(default=None, validation_alias="ANTHROPIC_API_KEY")
        log_level: str = "INFO"

        @model_validator(mode="after")
        def populate_derived_paths(self) -> Self:
            if self.browser_user_data_root is None:
                self.browser_user_data_root = _default_browser_user_data_root(self.evidence_root)
            return self

        @classmethod
        def from_env(cls) -> Self:
            return cls()
