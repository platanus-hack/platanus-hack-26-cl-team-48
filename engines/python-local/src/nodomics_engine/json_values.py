"""Turns cell values from Arrow into values JSON can carry and a browser can read."""

import datetime
import decimal
import math
from typing import cast


def to_json_value(value: object) -> object:
    match value:
        case None | bool() | int() | str() | bytes():
            return value
        case float():
            return value if math.isfinite(value) else None
        case decimal.Decimal():
            return to_json_value(float(value))
        case datetime.date() | datetime.time():
            return value.isoformat()
        case datetime.timedelta():
            return value.total_seconds()
        case list():
            return [to_json_value(item) for item in cast(list[object], value)]
        case dict():
            return {
                str(key): to_json_value(item)
                for key, item in cast(dict[object, object], value).items()
            }
        case _:
            return str(value)
