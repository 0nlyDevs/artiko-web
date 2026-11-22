import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BRAND } from "@/lib/brand";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/password";

// What the browser would know: the address, and whether a session is open.
const browser = vi.hoisted(() => ({ pathname: "/sign-in", search: "", user: null as { name: string; email: string } | null }));

vi.mock("next/navigation", () => ({
  usePathname: () => browser.pathname,
  useSearchParams: () => new URLSearchParams(browser.search),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: browser.user ? { user: browser.user } : null }) },
}));

const { AuthDoors } = await import("./auth-doors");
const { FormError } = await import("./fields");
const { ForgotForm } = await import("./forgot-form");
const { ResetForm } = await import("./reset-form");
const { SignInForm } = await import("./sign-in-form");
const { SignUpForm } = await import("./sign-up-form");
const { AccountError } = await import("./account-error");

// The server renders in English, the reference dictionary.
const html = renderToStaticMarkup;
const tags = (markup: string, name: string) => [...markup.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map((m) => m[0]);
const attr = (element: string, name: string) => element.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const field = (markup: string, id: string) => tags(markup, "input").find((input) => attr(input, "id") === id) ?? "";
const hrefs = (markup: string) => tags(markup, "a").map((a) => attr(a, "href"));
const buttons = (markup: string) => [...markup.matchAll(/<button\b[^>]*>(.*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
const noWait = { left: null, waiting: false, fetchOptions: { onError() {} } };

beforeEach(() => {
  browser.pathname = "/sign-in";
  browser.search = "";
  browser.user = null;
});

describe("the account layout", () => {
  it("opens the two doors as tabs, one per address, and marks the open one", () => {
    browser.pathname = "/sign-up";
    const markup = html(<AuthDoors>form</AuthDoors>);
    const doors = tags(markup, "a").filter((a) => ["/sign-up", "/sign-in"].includes(attr(a, "href") ?? ""));
    expect(doors.map((a) => [attr(a, "href"), attr(a, "aria-current")])).toEqual([
      ["/sign-up", "page"],
      ["/sign-in", undefined],
    ]);
    expect(markup).toContain("Create an account");
  });

  it("carries the way back from one door to the other", () => {
    browser.search = "next=%2Fworks%2F12";
    const markup = html(<AuthDoors>form</AuthDoors>);
    expect(hrefs(markup)).toContain("/sign-up?next=%2Fworks%2F12");
    expect(hrefs(markup)).toContain("/sign-in?next=%2Fworks%2F12");
  });

  it("never carries an address of another site", () => {
    browser.search = "next=https%3A%2F%2Fevil.example";
    expect(hrefs(html(<AuthDoors>form</AuthDoors>))).toContain("/sign-up");
  });

  it("keeps the wordmark, the way back, the three languages, the clip and its credits, and no app navigation", () => {
    const markup = html(<AuthDoors>form</AuthDoors>);
    expect(markup).toContain(`>${BRAND}<`);
    expect(hrefs(markup)).toEqual(expect.arrayContaining(["/", "/explore", "/auth/CREDITS.md"]));
    expect(buttons(markup)).toEqual(["EN", "FR", "MG"]);
    expect(attr(tags(markup, "video")[0], "src")).toBe("/auth/painting.mp4");
    for (const page of ["/hall-of-fame", "/heritage", "/scan", "/me"]) expect(hrefs(markup)).not.toContain(page);
  });

  it("has one clip per page, and no tabs on the password pages", () => {
    browser.pathname = "/sign-up";
    expect(attr(tags(html(<AuthDoors>form</AuthDoors>), "video")[0], "src")).toBe("/auth/pottery.mp4");
    browser.pathname = "/reset-password";
    const reset = html(<AuthDoors>form</AuthDoors>);
    expect(attr(tags(reset, "video")[0], "src")).toBe("/auth/palette.mp4");
    expect(hrefs(reset)).not.toContain("/sign-up");
    browser.pathname = "/forgot-password";
    expect(hrefs(html(<AuthDoors>form</AuthDoors>))).not.toContain("/sign-in");
  });

  it("sets one word of the headline in the accent colour and keeps its line breaks", () => {
    const markup = html(<AuthDoors>form</AuthDoors>);
    expect(markup).toMatch(/Every art\ndeserves\n<span class="[^"]*">its museum\.<\/span>/);
    expect(markup).not.toContain("&lt;em&gt;");
  });
});

describe("the sign-in form", () => {
  it("asks for an email and a password, and keeps the way to a forgotten password", () => {
    const markup = html(<SignInForm />);
    expect(attr(field(markup, "email"), "type")).toBe("email");
    expect(attr(field(markup, "email"), "autoComplete") ?? attr(field(markup, "email"), "autocomplete")).toBe("email");
    expect(attr(field(markup, "password"), "type")).toBe("password");
    expect(attr(field(markup, "password"), "autoComplete") ?? attr(field(markup, "password"), "autocomplete")).toBe("current-password");
    expect(hrefs(markup)).toContain("/forgot-password");
    expect(markup).toMatch(/<h1[^>]*>Sign in<\/h1>/);
  });

  it("offers no social sign-in: its only buttons are the eye and the submit", () => {
    expect(buttons(html(<SignInForm />))).toEqual(["", "Sign in"]);
  });

  it("confirms the address where a verification link lands", () => {
    browser.search = "verified=1";
    const markup = html(<SignInForm />);
    expect(markup).toContain("Address confirmed, sign in.");
    expect(markup).toMatch(/role="status"[^>]*>.*Address confirmed/);
  });

  it("explains a dead verification link as an alert", () => {
    browser.search = "verified=1&error=TOKEN_EXPIRED";
    const markup = html(<SignInForm />);
    expect(markup).toContain("This link no longer works");
    expect(markup).not.toContain("Address confirmed");
    expect(markup).toContain('role="alert"');
  });

  it("tells a visitor who already has a session, and shows the way to my space", () => {
    browser.user = { name: "Rova Rasoanaivo", email: "rova@example.test" };
    const markup = html(<SignInForm />);
    expect(markup).toContain("You are already signed in as Rova Rasoanaivo.");
    expect(hrefs(markup)).toContain("/me");
    browser.user = null;
    expect(html(<SignInForm />)).not.toContain("already signed in");
  });
});

describe("the sign-up form", () => {
  it("starts with who you are: a name of 100 characters at most and an email, no password yet", () => {
    browser.pathname = "/sign-up";
    const markup = html(<SignUpForm />);
    expect(markup).toContain("Step 1 of 2");
    expect(attr(field(markup, "name"), "maxLength") ?? attr(field(markup, "name"), "maxlength")).toBe("100");
    expect(field(markup, "name")).toContain("required");
    expect(attr(field(markup, "email"), "type")).toBe("email");
    expect(markup).toContain("Used to sign in and to recover your account, never for advertising.");
    expect(field(markup, "password")).toBe("");
    expect(buttons(markup)).toEqual(["Continue"]);
  });

  it("draws the switch of the frame, off, as a real checkbox announced as a switch", () => {
    const markup = html(<SignUpForm />);
    const toggle = tags(markup, "input").find((input) => attr(input, "role") === "switch") ?? "";
    expect(attr(toggle, "type")).toBe("checkbox");
    expect(toggle).not.toContain("checked");
    expect(markup).toContain("I also want to publish my works");
    expect(markup).toContain("Otherwise you can create your profile later, when you publish.");
  });

  it("asks nobody to accept terms of use that do not exist", () => {
    expect(html(<SignUpForm />)).not.toContain("terms of use");
  });
});

describe("the forgotten password form", () => {
  it("asks for the email and leads back to signing in", () => {
    browser.pathname = "/forgot-password";
    const markup = html(<ForgotForm />);
    expect(markup).toMatch(/<h1[^>]*>Forgotten password<\/h1>/);
    expect(attr(field(markup, "email"), "type")).toBe("email");
    expect(hrefs(markup)).toContain("/sign-in");
    expect(buttons(markup)).toEqual(["Send me a link"]);
  });
});

describe("the new password form", () => {
  it("says a link without a token no longer works, and offers a new one", () => {
    browser.pathname = "/reset-password";
    browser.search = "error=INVALID_TOKEN";
    const markup = html(<ResetForm />);
    expect(markup).toContain("This link no longer works");
    expect(markup).toContain('role="alert"');
    expect(hrefs(markup)).toContain("/forgot-password");
    expect(tags(markup, "input")).toEqual([]);
  });

  it("asks twice for a password within the server's lengths, and waits for both to match", () => {
    browser.pathname = "/reset-password";
    browser.search = "token=abc";
    const markup = html(<ResetForm />);
    const password = field(markup, "password");
    const confirm = field(markup, "confirm");
    expect(attr(password, "minLength") ?? attr(password, "minlength")).toBe(String(MIN_PASSWORD_LENGTH));
    for (const input of [password, confirm]) {
      expect(attr(input, "maxLength") ?? attr(input, "maxlength")).toBe(String(MAX_PASSWORD_LENGTH));
      expect(attr(input, "autoComplete") ?? attr(input, "autocomplete")).toBe("new-password");
      expect(attr(input, "aria-describedby")).toBeTruthy();
    }
    expect(markup).toContain(`At least ${MIN_PASSWORD_LENGTH} characters.`);
    expect(tags(markup, "button").find((button) => attr(button, "type") === "submit")).toContain("disabled");
  });
});

describe("FormError", () => {
  it("translates the error of a form as an alert", () => {
    const markup = html(<FormError error="auth.compromised" wait={noWait} />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("known data breach");
    expect(html(<FormError error={null} wait={noWait} />)).toBe("");
  });

  it("counts down a rate limit that says how long to wait, without reading every second aloud", () => {
    const markup = html(<FormError error="auth.tooMany" wait={{ ...noWait, left: 42, waiting: true }} />);
    expect(markup).toContain("Too many attempts.");
    expect(markup).toMatch(/<span aria-hidden="true"[^>]*>A new attempt is possible in 42 s\.<\/span>/);
  });

  it("says when the wait is over", () => {
    const markup = html(<FormError error="auth.tooMany" wait={{ ...noWait, left: 0 }} />);
    expect(markup).toContain("You can try again now.");
    expect(markup).toContain('role="status"');
  });

  it("keeps the fixed sentence when the answer gave no wait", () => {
    expect(html(<FormError error="auth.tooMany" wait={noWait} />)).toContain("Wait a minute, then try again.");
  });
});

describe("the account error screen", () => {
  it("speaks of the page, not of works, and offers to try again", () => {
    const markup = html(<AccountError retry={() => {}} />);
    expect(markup).toContain("This page did not open");
    expect(markup).not.toContain("works");
    expect(buttons(markup)).toEqual(["Try again"]);
  });
});
