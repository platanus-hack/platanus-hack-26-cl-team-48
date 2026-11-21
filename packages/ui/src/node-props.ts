import type { ReactNode } from "react";
import type { IconName } from "./icons.ts";
import type { PortProps } from "./Port.tsx";
import type { Condition, Engine, ExecState } from "./types.ts";

export type NodeVariant = "source" | "transform" | "combine" | "code" | "view" | "subflow" | "io";
export type NodeZoom = "far" | "mid" | "near";
export type NodeOrigin = "hub" | "verified" | "org" | "official";

export type NodeAction = "run" | "view-data" | "toggle-disabled" | "more";

export type NodeProps = {
  readonly variant?: NodeVariant;
  readonly title: string;
  readonly originalTitle?: string;
  readonly icon?: IconName;
  readonly language?: string;
  readonly innerCount?: number;
  readonly origin?: string;
  readonly sourceIcon?: IconName;
  readonly inputs?: ReadonlyArray<PortProps>;
  readonly outputs?: ReadonlyArray<PortProps>;
  readonly rows?: number;
  readonly cols?: number;
  readonly summary?: string;
  readonly thumbnail?: ReactNode;
  readonly state?: ExecState;
  readonly progress?: number;
  readonly errorMessage?: string;
  readonly conditions?: ReadonlyArray<Condition>;
  readonly engine?: Engine;
  readonly from?: NodeOrigin;
  readonly comments?: number;
  readonly collaborator?: { readonly name: string; readonly color?: 1 | 2 | 3 | 4 | 5 | 6 };
  readonly pending?: boolean;
  readonly selected?: boolean;
  readonly dragging?: boolean;
  readonly zoom?: NodeZoom;
  readonly width?: number;
  readonly showActions?: boolean;
  readonly onAction?: ((action: NodeAction) => void) | undefined;
};
