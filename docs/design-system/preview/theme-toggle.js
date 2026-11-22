const root = document.documentElement;

function setTheme(theme) {
  root.dataset.theme = theme;
  for (const button of document.querySelectorAll("[data-set-theme]")) {
    button.setAttribute("aria-pressed", String(button.dataset.setTheme === theme));
  }
}

function currentTheme() {
  return (
    root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
}

for (const button of document.querySelectorAll("[data-theme-toggle]")) {
  button.addEventListener("click", () => {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  });
}
for (const button of document.querySelectorAll("[data-set-theme]")) {
  button.addEventListener("click", () => {
    setTheme(button.dataset.setTheme);
  });
}
