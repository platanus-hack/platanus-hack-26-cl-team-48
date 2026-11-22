export type EditError = { readonly message: string };
export type PortRef = string;
export type CodeNodeArgs = {
  readonly nodeId: string;
  readonly language: "python" | "sql";
  readonly code: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
};
export type EditOp =
  | { readonly op: "add_node"; readonly args: { readonly type: string; readonly nodeId: string } }
  | { readonly op: "remove_node"; readonly args: { readonly nodeId: string } }
  | {
      readonly op: "connect" | "disconnect";
      readonly args: { readonly from: PortRef; readonly to: PortRef };
    }
  | {
      readonly op: "set_param";
      readonly args: { readonly nodeId: string; readonly name: string; readonly value: unknown };
    }
  | { readonly op: "create_code_node" | "update_code_node"; readonly args: CodeNodeArgs };
export type ChangeKind =
  | "add_node"
  | "remove_node"
  | "connect"
  | "disconnect"
  | "set_param"
  | "add_custom_node"
  | "update_custom_node";
export type Change = {
  readonly id: string;
  readonly kind: ChangeKind;
  readonly target: string;
  readonly before?: unknown;
  readonly after?: unknown;
};
export type ValidationIssue = { readonly nodeId: string; readonly message: string };
export type ManifestSummary = {
  readonly type: string;
  readonly title: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly params: readonly {
    readonly name: string;
    readonly title: string;
    readonly unit: string | null;
    readonly schema: unknown;
  }[];
};
