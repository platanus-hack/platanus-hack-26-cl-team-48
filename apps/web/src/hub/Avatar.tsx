type AvatarProps = {
  readonly name: string;
  readonly url?: string | undefined;
  readonly size?: "sm" | "md" | "lg";
};

/** A person's picture, or their initial on a tinted circle when they have none. */
export function Avatar({ name, url, size = "sm" }: AvatarProps) {
  return (
    <span className={`web-avatar web-avatar-${size}`} aria-hidden="true">
      {url === undefined ? initialOf(name) : <img src={url} alt="" />}
    </span>
  );
}

const initialOf = (name: string) => name.trim().charAt(0).toLocaleUpperCase() || "?";
