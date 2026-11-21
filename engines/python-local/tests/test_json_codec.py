from nodomics_engine.json_codec import decode_json, encode_json


def test_decodes_bytes_marker_into_bytes():
    text = '{"arrow": {"$bytes": "aGk="}, "n": 1}'

    value = decode_json(text)

    assert value == {"arrow": b"hi", "n": 1}


def test_encodes_bytes_as_base64_marker():
    value = {"arrow": b"hi", "items": [b"\x00\xff"]}

    text = encode_json(value)

    assert decode_json(text) == value
    assert '{"$bytes": "aGk="}' in text


def test_keeps_objects_with_extra_keys_next_to_marker():
    text = '{"$bytes": "aGk=", "other": 1}'

    value = decode_json(text)

    assert value == {"$bytes": "aGk=", "other": 1}


def test_decodes_browser_compatible_unpadded_and_whitespace_base64():
    assert decode_json('{"$bytes": " aGk\\n"}') == b"hi"
