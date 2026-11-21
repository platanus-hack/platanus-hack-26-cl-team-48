import type { ReactNode } from "react";
import { Button } from "./Button.tsx";
import { Icon } from "./Icon.tsx";
import type { IconName } from "./icons.ts";
import { MESSAGES } from "./messages.ts";

type NoticeTone = "info" | "ok" | "warn" | "error" | "ai";

const NOTICE_ICONS: Record<NoticeTone, IconName> = {
  info: "info",
  ok: "circle-check",
  warn: "triangle-alert",
  error: "circle-alert",
  ai: "sparkles",
};

export type NoticeProps = {
  readonly tone?: NoticeTone;
  readonly title?: string;
  readonly detail?: string;
  readonly actions?: ReactNode;
  readonly onClose?: (() => void) | null;
  readonly children?: ReactNode;
};

export function Notice({ tone = "info", title, detail, actions, onClose, children }: NoticeProps) {
  return (
    <div className={`nd-notice nd-notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={NOTICE_ICONS[tone]} />
      <div className="nd-notice-body">
        {title !== undefined && <div className="nd-notice-title">{title}</div>}
        {children !== undefined && <div className="nd-notice-text">{children}</div>}
        {detail !== undefined && (
          <details className="nd-notice-detail">
            <summary>{MESSAGES.notice.technicalDetail}</summary>
            <pre>{detail}</pre>
          </details>
        )}
        {actions !== undefined && <div className="nd-notice-actions">{actions}</div>}
      </div>
      {onClose !== undefined && onClose !== null && (
        <Button
          variant="ghost"
          size="sm"
          icon="x"
          label={MESSAGES.notice.close}
          onClick={onClose}
        />
      )}
    </div>
  );
}
