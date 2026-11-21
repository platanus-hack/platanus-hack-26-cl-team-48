import { createContext, useContext } from "react";

type FieldControl = { readonly id: string | undefined; readonly isInvalid: boolean };

const NO_FIELD: FieldControl = { id: undefined, isInvalid: false };

/** Lets a Field label its control and mark it invalid without the caller wiring ids by hand. */
export const FieldContext = createContext<FieldControl>(NO_FIELD);

export function useFieldControl(invalid: boolean | undefined): FieldControl {
  const field = useContext(FieldContext);
  return { id: field.id, isInvalid: invalid ?? field.isInvalid };
}

export function useFieldControlId(): string | undefined {
  return useFieldControl(undefined).id;
}
