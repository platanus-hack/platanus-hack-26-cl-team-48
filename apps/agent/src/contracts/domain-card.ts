import { Type, type Static } from "@sinclair/typebox";

export const DomainCard = Type.Object({
  changeId: Type.String(),
  title: Type.String(),
  before: Type.Optional(Type.Unknown()),
  after: Type.Optional(Type.Unknown()),
  unit: Type.Optional(Type.String()),
  reason: Type.String(),
});
export type DomainCard = Static<typeof DomainCard>;
