import { useFieldControlId } from "@nodomics/ui";

const PDF_MIME_TYPE = "application/pdf";

export function PdfInput({ onChange }: { readonly onChange: (file: File | undefined) => void }) {
  return (
    <input
      id={useFieldControlId()}
      type="file"
      accept={PDF_MIME_TYPE}
      onChange={(event) => {
        onChange(event.target.files?.[0]);
      }}
    />
  );
}
