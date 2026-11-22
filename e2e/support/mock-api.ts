import http from "node:http";
import type { AddressInfo } from "node:net";

export interface SentFile {
  name: string;
  type: string;
  size: number;
  /** First 12 bytes as latin1, enough to read a glTF or RIFF/WEBP signature. */
  head: string;
}

export type SentFields = Record<string, SentFile | string>;

const artist = { id: "a1", display_name: "Rova", bio: "Vannier", region: "Ambositra" };

export const baseWork = {
  artist_id: "a1",
  artist_name: "Rova",
  story: "",
  category: "crafts",
  exposition_id: null,
  series_id: null,
  proof_urls: [],
  sha256: "0".repeat(64),
  human_proven: false,
  ai_declared: false,
  month: "2026-11",
  created_at: "2026-11-22T00:00:00Z",
  votes: 0,
};

/**
 * Stands in for artiko-api on 127.0.0.1: the signed-in artist, POST /works (multipart kept for assertions,
 * files then served under /media/<field>), and a museum whose works the test sets.
 */
export class MockApi {
  readonly posts: SentFields[] = [];
  museumWorks: object[] = [];
  /** Number of upcoming requests to /media/flaky that answer 500 before it serves the 1K file. */
  flakyFailures = 0;
  private readonly media = new Map<string, { body: Buffer; type: string }>();
  private readonly server = http.createServer((req, res) => {
    this.handle(req, res).catch((error: unknown) => {
      res.writeHead(500).end(String(error));
    });
  });

  async listen(port = 0): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(port, "127.0.0.1", resolve));
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }

  get url(): string {
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "authorization, content-type");
    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return void res.writeHead(204).end();
    const path = new URL(req.url ?? "/", this.url).pathname;
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
    };

    if (path === "/api/v1/me") return json(200, { id: "u1", email: "rova@example.test", name: "Rova", artist });
    if (path === "/api/v1/categories") return json(200, [{ id: "crafts", label: "Crafts" }]);
    if (path === "/api/v1/works" && req.method === "POST") return json(201, await this.publish(req));
    if (path === "/api/v1/artists/a1/museum") {
      const slots = this.museumWorks.map((work, i) => ({ work, kind: "plinth", position: [-1.5 + i * 3, 1, -1], rotation_y: 0 }));
      return json(200, { artist, room: { width: 8, depth: 8, height: 3.5 }, slots });
    }
    if (path === "/media/flaky" && this.flakyFailures > 0) {
      this.flakyFailures--;
      return json(500, { error: { code: "boom", message: "boom" } });
    }
    const file = this.media.get(path === "/media/flaky" ? "/media/file" : path);
    if (file) return void res.writeHead(200, { "content-type": file.type }).end(file.body);
    json(404, { error: { code: "not_found", message: path } });
  }

  private async publish(req: http.IncomingMessage) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const form = await new Request(this.url, {
      method: "POST",
      headers: { "content-type": req.headers["content-type"] ?? "" },
      body: Buffer.concat(chunks),
    }).formData();
    const fields: SentFields = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
        continue;
      }
      const body = Buffer.from(await value.arrayBuffer());
      fields[key] = { name: value.name, type: value.type, size: body.length, head: body.subarray(0, 12).toString("latin1") };
      this.media.set(`/media/${key}`, { body, type: value.type || "application/octet-stream" });
    }
    this.posts.push(fields);
    return { ...baseWork, id: "w1", title: String(form.get("title")), media_kind: "model", ...this.modelUrls("file") };
  }

  modelUrls(main: "file" | "flaky", withHd = true) {
    return {
      media_url: `${this.url}/media/${main}`,
      media_hd_url: withHd ? `${this.url}/media/model_hd` : null,
      poster_url: `${this.url}/media/poster`,
    };
  }
}
