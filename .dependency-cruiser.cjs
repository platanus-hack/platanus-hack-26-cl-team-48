/** Enforces the package boundaries described in docs/engineering/arquitectura.md §3. */
const pkg = (name) => `^packages/${name}/`;
const internal = "^(packages|apps)/";

module.exports = {
  forbidden: [
    {
      name: "agent-uses-only-protocol",
      severity: "error",
      from: { path: "^apps/agent/" },
      to: { path: internal, pathNot: ["^apps/agent/", pkg("protocol")] },
    },
    {
      name: "nothing-imports-agent",
      severity: "error",
      from: { pathNot: "^apps/agent/" },
      to: { path: "^apps/agent/" },
    },
    {
      name: "web-only-uses-protocol-client-ui",
      severity: "error",
      from: { path: "^apps/web/", pathNot: "^apps/web/src/engine-registry\\.ts$" },
      to: {
        path: internal,
        pathNot: ["^apps/web/", pkg("protocol"), pkg("client"), pkg("ui"), pkg("hub")],
      },
    },
    {
      name: "engine-registry-only-references-engine-workers",
      comment: "ADR 0008: the registry imports worker entry URLs, never engine code.",
      severity: "error",
      from: { path: "^apps/web/src/engine-registry\\.ts$" },
      to: {
        path: internal,
        pathNot: [
          "^apps/web/",
          pkg("protocol"),
          pkg("client"),
          pkg("ui"),
          "^packages/engine-[^/]+/src/worker\\.ts$",
        ],
      },
    },
    {
      name: "leaf-packages-have-no-internal-deps",
      severity: "error",
      from: { path: "^packages/(protocol|rpc|ui)/" },
      to: { path: internal, pathNot: ["^packages/$1/"] },
    },
    {
      name: "client-uses-only-rpc-and-protocol",
      severity: "error",
      from: { path: pkg("client") },
      to: { path: internal, pathNot: [pkg("client"), pkg("rpc"), pkg("protocol")] },
    },
    {
      name: "coordinator-does-not-know-concrete-executors",
      severity: "error",
      from: { path: pkg("coordinator") },
      to: { path: internal, pathNot: [pkg("coordinator"), pkg("rpc"), pkg("protocol")] },
    },
    {
      name: "executors-use-only-protocol-and-rpc",
      severity: "error",
      from: { path: "^packages/executor-[^/]+/" },
      to: { path: internal, pathNot: ["^packages/executor-[^/]+/", pkg("rpc"), pkg("protocol")] },
    },
    {
      name: "engine-mock-uses-only-rpc-and-protocol",
      severity: "error",
      from: { path: pkg("engine-mock") },
      to: { path: internal, pathNot: [pkg("engine-mock"), pkg("rpc"), pkg("protocol")] },
    },
    {
      name: "nodes-core-uses-only-protocol",
      severity: "error",
      from: { path: pkg("nodes-core") },
      to: { path: internal, pathNot: [pkg("nodes-core"), pkg("protocol")] },
    },
    {
      name: "engine-browser-only-assembles-engine-packages",
      severity: "error",
      from: { path: pkg("engine-browser") },
      to: {
        path: internal,
        pathNot: [
          pkg("engine-browser"),
          pkg("coordinator"),
          "^packages/executor-[^/]+/",
          pkg("nodes-core"),
          pkg("rpc"),
          pkg("protocol"),
        ],
      },
    },
    {
      name: "hub-uses-only-protocol",
      comment: "ADR 0018: the hub stores and finds flows; it never talks to an engine.",
      severity: "error",
      from: { path: pkg("hub") },
      to: { path: internal, pathNot: [pkg("hub"), pkg("protocol")] },
    },
    {
      name: "nothing-imports-apps",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-deep-imports-into-other-packages",
      comment:
        "Import other packages through their public index, public stylesheets or worker entry only.",
      severity: "error",
      from: { path: "^(packages|apps)/([^/]+)/" },
      to: {
        path: "^packages/([^/]+)/src/(?!index\\.ts$)",
        pathNot: [
          "^packages/$2/",
          "^packages/ui/src/(tokens|fonts|components)\\.css$",
          "^packages/engine-[^/]+/src/worker\\.ts$",
        ],
      },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(node_modules|dist|coverage)" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "types", "default"],
    },
  },
};
