/** Quotes a table or column name so any text is safe inside SQL. */
export const quoteIdentifier = (name: string): string => `"${name.replaceAll('"', '""')}"`;

/** Quotes a string literal so any text is safe inside SQL. */
export const quoteLiteral = (value: string): string => `'${value.replaceAll("'", "''")}'`;
