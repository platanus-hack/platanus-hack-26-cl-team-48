import { Icon, useFieldControlId } from "@nodomics/ui";
import { useState } from "react";

const PDF_MIME_TYPE = "application/pdf";

type PdfInputProps = {
  readonly hint: string;
  readonly onChange: (file: File | undefined) => void;
};

/** A drop zone: the transparent file input covers it, so clicking and dropping both work. */
export function PdfInput({ hint, onChange }: PdfInputProps) {
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  return (
    <div className="web-feed-dropzone">
      <Icon name={fileName === undefined ? "upload" : "check"} />
      <span>{fileName ?? hint}</span>
      <input
        id={useFieldControlId()}
        type="file"
        accept={PDF_MIME_TYPE}
        onChange={(event) => {
          const file = event.target.files?.[0];
          setFileName(file?.name);
          onChange(file);
        }}
      />
    </div>
  );
}
