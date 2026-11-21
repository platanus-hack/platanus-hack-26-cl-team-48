"""Maps Arrow types to the protocol's ColumnType."""

import pyarrow as pa
import pyarrow.types as pat

from nodomics_engine.protocol_types import Column, ColumnType


def describe_columns(schema: pa.Schema) -> list[Column]:
    return [
        {"name": name, "type": column_type(arrow_type)}
        for name, arrow_type in zip(schema.names, schema.types, strict=True)
    ]


def column_type(arrow_type: pa.DataType) -> ColumnType:
    if pat.is_integer(arrow_type) or pat.is_floating(arrow_type) or pat.is_decimal(arrow_type):
        return "number"
    if pat.is_string(arrow_type) or pat.is_large_string(arrow_type):
        return "text"
    if pat.is_date(arrow_type) or pat.is_timestamp(arrow_type):
        return "date"
    if pat.is_boolean(arrow_type):
        return "bool"
    return "other"
