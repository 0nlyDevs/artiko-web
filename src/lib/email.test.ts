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

  it("fails when Resend refuses, so the caller can log it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad sender", { status: 403 })));
    await expect(sendEmail(email, { RESEND_API_KEY: "re_test" })).rejects.toThrow("Resend answered 403: bad sender");
  });

  it("prints the email in development when no key is set", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendEmail(email, { NODE_ENV: "development" });
    expect(log.mock.calls[0][0]).toContain("Body");
  });

  it("never stays silent in production without a key", async () => {
    await expect(sendEmail(email, { NODE_ENV: "production" })).rejects.toThrow("RESEND_API_KEY");
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
