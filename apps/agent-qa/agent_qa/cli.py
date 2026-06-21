import typer

app = typer.Typer(help="Highport Agent-QA harness.")


@app.command()
def probe() -> None:
    raise NotImplementedError("Phase 1")


@app.command()
def bootstrap() -> None:
    raise NotImplementedError("Phase 1")


@app.command()
def run(charter: str = "all", only: str | None = None) -> None:
    _ = charter, only
    raise NotImplementedError("Phase 2")


@app.command("list")
def list_charters() -> None:
    raise NotImplementedError("Phase 1")


@app.command()
def report() -> None:
    raise NotImplementedError("Phase 3")
