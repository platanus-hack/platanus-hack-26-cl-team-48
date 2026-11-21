import { Field, Input } from "@nodomics/ui";
import { useLocalAddress } from "../engine/use-local-address.ts";
import type { LocalAddress } from "../engine/local-address.ts";
import { MESSAGES } from "../messages.ts";

export function LocalAddressForm({
  onConnect,
  initialAddress,
}: {
  readonly initialAddress: string;
  readonly onConnect: (address: LocalAddress) => void;
}) {
  const { address, setAddress, error, connect } = useLocalAddress(onConnect, initialAddress);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        connect();
      }}
    >
      <Field
        label={MESSAGES.engines.address}
        help={MESSAGES.engines.localhostPermission}
        {...(error === undefined ? {} : { error })}
      >
        <Input value={address} onChange={setAddress} />
      </Field>
      <button type="submit" className="nd-btn nd-btn-secondary nd-btn-md">
        {MESSAGES.engines.connect}
      </button>
    </form>
  );
}
