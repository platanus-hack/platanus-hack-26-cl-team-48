def run(inputs, params):
    table = inputs["in"].copy()
    values = table[params["column"]]
    table[params.get("name", "zscore")] = (values - values.mean()) / values.std(ddof=0)
    return {"out": table}
