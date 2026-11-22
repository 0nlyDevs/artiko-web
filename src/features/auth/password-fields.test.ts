import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const count = (text: string, part: string) => text.split(part).length - 1;

describe("new password fields", () => {
  it.each(["./sign-up-form.tsx", "./reset-form.tsx"])("cap every field of %s at the server's maximum", (file) => {
    const form = readFileSync(new URL(file, import.meta.url), "utf8");
    expect(count(form, "<PasswordField")).toBe(2);
    expect(count(form, "maxLength={MAX_PASSWORD_LENGTH}")).toBe(2);
    expect(form).toContain('t("auth.tooLong")');
  });
});
