import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppStoresContext } from "../app-context.ts";
import { createAppStores, type AppStores } from "../app-stores.ts";

/** Renders `ui` with a fresh set of app stores and hands them back to the test. */
export function renderWithStores(ui: ReactNode, stores: AppStores = createAppStores()) {
  return { stores, ...render(<AppStoresContext value={stores}>{ui}</AppStoresContext>) };
}
