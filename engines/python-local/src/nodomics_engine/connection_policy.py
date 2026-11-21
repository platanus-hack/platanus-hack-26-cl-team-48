"""Decides whether a WebSocket handshake may open: it needs the token and an allowed origin."""

import hmac
from dataclasses import dataclass
from http import HTTPStatus
from urllib.parse import parse_qs, urlsplit

TOKEN_PARAM = "token"


@dataclass(frozen=True)
class ConnectionPolicy:
    token: str
    allowed_origins: frozenset[str]

    def refuse(self, path: str, origin: str | None) -> HTTPStatus | None:
        """Returns the status that refuses the handshake, or None when it may open."""
        if not hmac.compare_digest(_token_in(path).encode(), self.token.encode()):
            return HTTPStatus.UNAUTHORIZED
        # A missing Origin is refused too: the only expected client is the app in a browser.
        if origin not in self.allowed_origins:
            return HTTPStatus.FORBIDDEN
        return None


def _token_in(path: str) -> str:
    return next(iter(parse_qs(urlsplit(path).query).get(TOKEN_PARAM, [])), "")
