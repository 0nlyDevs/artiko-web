import { afterEach, describe, expect, it, vi } from "vitest";
import { accountEmail, emailLocale, sendEmail } from "./email";

const email = { to: "a@example.test", subject: "Hi", text: "Body", html: "<p>Body</p>" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  it("posts the email to Resend with the key and sender", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await sendEmail(email, { RESEND_API_KEY: "re_test", EMAIL_FROM: "Artiko <hi@artiko.test>" });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toEqual({ from: "Artiko <hi@artiko.test>", to: ["a@example.test"], subject: "Hi", text: "Body", html: "<p>Body</p>" });
  });

  it("fails with the status only when Resend refuses, so the log never holds what it quoted", async () => {
    const body = JSON.stringify({ name: "validation_error", message: "Invalid `to` field: victim@example.test" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 422 })));
    const error = await sendEmail(email, { RESEND_API_KEY: "re_test" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Resend answered 422");
  });

  it("still fails with the status when Resend's answer breaks off, as the unread body cannot be cancelled", async () => {
    const broken = new ReadableStream({ start: (controller) => controller.error(new TypeError("terminated")) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(broken, { status: 502 })));
    await expect(sendEmail(email, { RESEND_API_KEY: "re_test" })).rejects.toThrow(new Error("Resend answered 502"));
  });

  it("prints the email in development when no key is set", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(sendEmail(email, { NODE_ENV: "development" })).resolves.toBeUndefined();
    expect(log.mock.calls[0][0]).toContain("Body");
  });

  it.each(["production", "test", "staging", undefined])("fails without a key when NODE_ENV is %j, and prints no link", async (NODE_ENV) => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(sendEmail(email, { NODE_ENV })).rejects.toThrow("RESEND_API_KEY is not set");
    expect(log).not.toHaveBeenCalled();
  });
});

describe("emailLocale", () => {
  it("reads the first supported language of Accept-Language", () => {
    const request = new Request("https://x.test", { headers: { "accept-language": "de-DE,fr-FR;q=0.9,en;q=0.8" } });
    expect(emailLocale(request)).toBe("fr");
  });

  it("falls back to English", () => {
    expect(emailLocale()).toBe("en");
  });
});

describe("accountEmail", () => {
  it("escapes the link in the HTML and keeps it intact in the text part", () => {
    const mail = accountEmail("verify", "en", "a@example.test", "https://artiko.test/api/auth/verify-email?token=t&callbackURL=%2Fme");
    expect(mail.html).toContain("token=t&amp;callbackURL");
    expect(mail.text).toContain("token=t&callbackURL");
  });

  it("writes every kind in the reader's language", () => {
    expect(accountEmail("existing", "fr", "a@example.test", "https://artiko.test/forgot-password").subject).toBe("Vous avez déjà un compte Artiko");
  });
});
