import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { ThemeControl } from "./ThemeControl.tsx";
it("sets explicit themes and delegates system changes to the token media query", async () => {
  const changes: string[] = [];
  const { rerender } = render(
    <ThemeControl theme="dark" onChange={(theme) => changes.push(theme)} />,
  );
  expect(document.documentElement.dataset["theme"]).toBe("dark");
  const darkIcon = screen.getByRole("button", { name: "Tema" }).querySelector("svg")?.innerHTML;
  expect(screen.getByRole("button", { name: "Tema" }).getAttribute("title")).toBe("Tema");
  await userEvent.click(screen.getByRole("button", { name: "Tema" }));
  await userEvent.click(screen.getByRole("menuitemradio", { name: "Claro" }));
  expect(changes).toEqual(["light"]);
  rerender(<ThemeControl theme="light" onChange={() => undefined} />);
  expect(document.documentElement.dataset["theme"]).toBe("light");
  const lightIcon = screen.getByRole("button", { name: "Tema" }).querySelector("svg")?.innerHTML;
  expect(lightIcon).not.toBe(darkIcon);
  rerender(<ThemeControl theme="system" onChange={() => undefined} />);
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  expect(screen.getByRole("button", { name: "Tema" }).querySelector("svg")?.innerHTML).not.toBe(
    lightIcon,
  );
  expect(screen.getByRole("button", { name: "Tema" }).querySelector("svg")?.innerHTML).not.toBe(
    darkIcon,
  );
});
