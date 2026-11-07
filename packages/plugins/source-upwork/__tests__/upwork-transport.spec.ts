import { createServer } from "node:http";
import { createRequire } from "node:module";

it("preserves the Upwork SDK JSON and bearer-auth callback transport with the maintained request fork", async () => {
  const sdkRequire = createRequire(
    require.resolve("@upwork/node-upwork-oauth2"),
  );
  const request = sdkRequire("request");
  expect(sdkRequire("request/package.json").name).toBe("@cypress/request");
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          auth: req.headers.authorization,
          body: JSON.parse(body),
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address() as { port: number };
    const result = await new Promise<any>((resolve, reject) =>
      request(
        {
          method: "POST",
          url: `http://127.0.0.1:${address.port}/graphql`,
          auth: { bearer: "test-token" },
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "{ jobs { id } }" }),
        },
        (
          error: Error | null,
          response: { statusCode: number },
          body: string,
        ) => {
          if (error) reject(error);
          else resolve({ status: response.statusCode, ...JSON.parse(body) });
        },
      ),
    );
    expect(result).toEqual({
      status: 200,
      auth: "Bearer test-token",
      body: { query: "{ jobs { id } }" },
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it("rejects cross-protocol redirects instead of bypassing SSRF protocol restrictions", async () => {
  const sdkRequire = createRequire(
    require.resolve("@upwork/node-upwork-oauth2"),
  );
  const request = sdkRequire("request");
  const server = createServer((_req, res) => {
    const address = server.address() as { port: number };
    res.writeHead(302, {
      Location: `https://127.0.0.1:${address.port}/private`,
    });
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address() as { port: number };
    await expect(
      new Promise((resolve, reject) =>
        request(
          {
            url: `http://127.0.0.1:${address.port}/redirect`,
            timeout: 1500,
          },
          (error: Error | null, _response: unknown, body: string) =>
            error ? reject(error) : resolve(body),
        ),
      ),
    ).rejects.toThrow(/Protocol.*not supported/i);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
