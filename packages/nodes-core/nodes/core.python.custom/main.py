def run(inputs, params):
    # The node exists to run the user's code: it must define transform(inputs).
    namespace = {}
    # Named so a traceback points to the lines of the user's code, which the editor marks.
    exec(compile(params["code"], "<code>", "exec"), namespace)
    return namespace["transform"](inputs)
