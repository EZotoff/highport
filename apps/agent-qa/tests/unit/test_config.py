from pathlib import Path

from agent_qa.config import Settings

ENV_VARS = [
    "AGENT_QA_WEB_URL",
    "AGENT_QA_HOCUSPOCUS_URL",
    "AGENT_QA_FASTIFY_URL",
    "AGENT_QA_POSTGRES_DSN",
    "AGENT_QA_RAG_URL",
    "AGENT_QA_OLLAMA_URL",
    "AGENT_QA_EVIDENCE_ROOT",
    "AGENT_QA_PLANNER_MODEL",
    "AGENT_QA_DRIVER_MODEL",
    "AGENT_QA_CRITIC_MODEL",
    "AGENT_QA_LLM_MODEL",
    "AGENT_QA_LLM_PROVIDER_PREF",
    "AGENT_QA_TEST_USER_EMAIL_FMT",
    "AGENT_QA_TEST_USER_PASSWORD",
    "AGENT_QA_TEST_USER_ROLES",
    "AGENT_QA_BROWSER_USER_DATA_ROOT",
    "AGENT_QA_LOG_LEVEL",
    "ANTHROPIC_API_KEY",
]


def clear_env(monkeypatch) -> None:
    for key in ENV_VARS:
        monkeypatch.delenv(key, raising=False)


def test_defaults_match_docker_compose_ports(monkeypatch, tmp_path: Path) -> None:
    clear_env(monkeypatch)
    monkeypatch.chdir(tmp_path)

    settings = Settings.from_env()

    assert settings.web_url == "http://localhost:18120"
    assert settings.hocuspocus_url == "http://localhost:18121"
    assert settings.fastify_url == "http://localhost:18122"
    assert settings.postgres_dsn == "postgres://highport:highport@localhost:18123/highport"
    assert settings.rag_url == "http://localhost:18124"
    assert settings.ollama_url == "http://localhost:11434"


def test_env_var_overrides(monkeypatch, tmp_path: Path) -> None:
    clear_env(monkeypatch)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("AGENT_QA_WEB_URL", "http://127.0.0.1:9000")
    monkeypatch.setenv("AGENT_QA_LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    settings = Settings.from_env()

    assert settings.web_url == "http://127.0.0.1:9000"
    assert settings.log_level == "DEBUG"
    assert settings.anthropic_api_key == "test-key"


def test_dotenv_file_is_loaded(monkeypatch, tmp_path: Path) -> None:
    clear_env(monkeypatch)
    monkeypatch.chdir(tmp_path)
    (tmp_path / ".env").write_text("AGENT_QA_DRIVER_MODEL=driver-from-dotenv\n", encoding="utf-8")

    settings = Settings.from_env()

    assert settings.driver_model == "driver-from-dotenv"


def test_evidence_root_defaults_to_relative_path(monkeypatch, tmp_path: Path) -> None:
    clear_env(monkeypatch)
    monkeypatch.chdir(tmp_path)

    settings = Settings.from_env()

    assert settings.evidence_root == Path(".sisyphus/evidence/agent-qa")


def test_model_defaults_are_configured(monkeypatch, tmp_path: Path) -> None:
    clear_env(monkeypatch)
    monkeypatch.chdir(tmp_path)

    settings = Settings.from_env()

    assert settings.planner_model == "claude-haiku-4-5"
    assert settings.driver_model == "claude-sonnet-4-5"
    assert settings.critic_model == "claude-sonnet-4-5"
    assert settings.llm_model == "gemini-2.5-flash"
    assert settings.llm_provider_pref == "auto"
    assert settings.test_user_roles == ("player1", "player2", "gm")
    assert settings.browser_user_data_root == Path(".sisyphus/evidence/browser-profiles")
