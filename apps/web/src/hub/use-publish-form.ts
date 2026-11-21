import { isValidSlug, nextPatchVersion, slugOf } from "@nodomics/hub";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useHub } from "./hub-context.ts";

export type PublishForm = {
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly tags: string;
  readonly version: string;
  readonly includeState: boolean;
};

/** The publish form: the identifier follows the title until edited, the version follows the identifier. */
export function usePublishForm(initialTitle: string) {
  const [form, setForm] = useState<PublishForm>({
    title: initialTitle,
    slug: slugOf(initialTitle),
    description: "",
    tags: "",
    version: nextPatchVersion(undefined),
    includeState: false,
  });
  const [isSlugEdited, setSlugEdited] = useState(false);
  useProposedVersion(form.slug, setForm);
  const change = (changes: Partial<PublishForm>) => {
    setForm((current) => ({ ...current, ...changes }));
  };
  return {
    form,
    change,
    setTitle: (title: string) => {
      change(isSlugEdited ? { title } : { title, slug: slugOf(title) });
    },
    setSlug: (slug: string) => {
      setSlugEdited(true);
      change({ slug });
    },
  };
}

function useProposedVersion(slug: string, setForm: Dispatch<SetStateAction<PublishForm>>) {
  const hub = useHub();
  useEffect(() => {
    if (!isValidSlug(slug)) return;
    let isCurrent = true;
    void hub.ownPublication(slug).then((result) => {
      if (!isCurrent || !result.ok) return;
      const version = nextPatchVersion(result.value?.latestVersion);
      setForm((current) => ({ ...current, version }));
    });
    return () => {
      isCurrent = false;
    };
  }, [hub, slug, setForm]);
}

export const tagsOf = (text: string): string[] =>
  text
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag !== "");
