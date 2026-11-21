import { Notice } from "@nodomics/ui";
import { useStore } from "zustand";
import { useAppStores } from "./app-context.ts";

/** The one notice the app is showing, if any. */
export function NoticeArea() {
  const { noticeStore } = useAppStores();
  const notice = useStore(noticeStore, (state) => state.notice);
  const dismiss = useStore(noticeStore, (state) => state.dismiss);
  if (notice === undefined) return null;
  return (
    <div className="web-notice">
      <Notice {...notice} onClose={dismiss} />
    </div>
  );
}
