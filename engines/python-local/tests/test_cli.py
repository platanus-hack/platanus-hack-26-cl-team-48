from pathlib import Path

from nodomics_engine.cli import connection_banner, parse_options
from nodomics_engine.protocol_schema import DEFAULT_SCHEMA_PATH
from nodomics_engine.server import ServerConfig


def test_defaults_to_port_7341_and_the_dev_app_origin():
    options = parse_options([], token="t")

    assert options.config == ServerConfig(
        port=7341, token="t", allowed_origins=frozenset({"http://localhost:5173"})
    )
    assert options.schema_path == DEFAULT_SCHEMA_PATH


def test_accepts_a_port_several_origins_and_a_schema_path():
    argv = [
        "--port",
        "9000",
        "--allow-origin",
        "https://app.example",
        "--allow-origin",
        "http://localhost:4173",
        "--schema",
        "/tmp/schema.json",
    ]

    options = parse_options(argv, token="t")

    assert options.config.port == 9000
    assert options.config.allowed_origins == {"https://app.example", "http://localhost:4173"}
    assert options.schema_path == Path("/tmp/schema.json")


def test_banner_shows_the_url_with_the_token():
    config = ServerConfig(port=7341, token="abc", allowed_origins=frozenset({"http://x"}))

    assert "ws://127.0.0.1:7341/?token=abc" in connection_banner(config)
