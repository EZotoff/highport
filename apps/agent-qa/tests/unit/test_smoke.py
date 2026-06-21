"""Smoke test: package imports cleanly."""


def test_package_imports() -> None:
    import agent_qa

    assert agent_qa.__version__


def test_version_format() -> None:
    import agent_qa

    parts = agent_qa.__version__.split(".")
    assert len(parts) >= 2, f"version {agent_qa.__version__} should be semver-ish"
