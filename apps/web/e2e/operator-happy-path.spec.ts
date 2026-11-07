import { expect, test } from "@playwright/test";

const UPDATED_AT = "2026-08-04T12:00:00.000Z";

test("an operator updates schedules and company tiers safely", async ({
  page,
}, testInfo) => {
  let watch = makeWatch();
  const defaults = [
    ...watch.sourceTargets,
    {
      ...watch.sourceTargets[0],
      site: "lever",
      companyName: "Beta",
      tier: 1,
      intervalMinutes: 10,
    },
  ];
  const requests: Array<{ headers: Record<string, string>; body: any }> = [];
  let baselineRequested = false;
  let resumeRequested = false;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    sessionStorage.setItem("radar.operator.api-key", "e2e-admin-key"),
  );
  await page.route("**/health", (route) =>
    route.fulfill({ json: { status: "healthy", uptime: 120 } }),
  );
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (
        url.pathname === "/api/watches/watch-1/apply" &&
        request.method() === "POST"
      ) {
        const body = request.postDataJSON();
        requests.push({ headers: request.headers(), body });
        const behavior = Boolean(
          body.patch.sourceTargets &&
          (body.patch.sourceTargets.length !== watch.sourceTargets.length ||
            body.patch.sourceTargets.some(
              (target: any, index: number) =>
                target.tier !== watch.sourceTargets[index]?.tier ||
                target.site !== watch.sourceTargets[index]?.site,
            )),
        );
        if (body.patch.sourceTargets && !behavior)
          body.patch.sourceTargets = body.patch.sourceTargets.map(
            (target: any, index: number) => ({
              ...watch.sourceTargets[index],
              ...target,
            }),
          );
        watch = {
          ...watch,
          ...body.patch,
          updatedAt: new Date(
            Date.parse(UPDATED_AT) + requests.length * 300000,
          ).toISOString(),
        };
        if (behavior)
          watch = {
            ...watch,
            enabled: false,
            sourceTargets: watch.sourceTargets.map((target) => ({
              ...target,
              initializedAt: null,
            })),
          };
        await route.fulfill({
          json: {
            watch,
            diff: [],
            systemChanges: [],
            changed: true,
            behaviorChanged: behavior,
            paused: !watch.enabled,
            pausedByApply: behavior,
            resumeRequired: behavior,
            targetKeysRequiringInitialization: behavior
              ? watch.sourceTargets.map((target) => target.site)
              : [],
          },
        });
      } else if (url.pathname === "/api/watches/watch-1/initialize") {
        baselineRequested = true;
        watch = {
          ...watch,
          sourceTargets: watch.sourceTargets.map((target) => ({
            ...target,
            initializedAt: "2026-08-04T13:00:00Z",
          })),
        };
        await route.fulfill({
          json: { status: "completed", notificationsSent: 0 },
        });
      } else if (url.pathname === "/api/watches/watch-1/resume") {
        resumeRequested = true;
        watch = { ...watch, enabled: true };
        await route.fulfill({ json: watch });
      } else if (url.pathname === "/api/watches/watch-1")
        await route.fulfill({ json: watch });
      else if (url.pathname === "/api/watches/presets")
        await route.fulfill({
          json: [
            {
              id: "canadian-tech-adjacent-internships",
              name: "Canadian Tech + Adjacent Internships",
              version: 1,
            },
          ],
        });
      else if (url.pathname.endsWith("/defaults"))
        await route.fulfill({
          json: { intervalMinutes: 30, sourceTargets: defaults },
        });
      else if (url.pathname === "/api/sources/health")
        await route.fulfill({
          json: {
            count: 1,
            sources: [{ site: "greenhouse", state: "closed" }],
          },
        });
      else if (url.pathname === "/api/notification-destinations")
        await route.fulfill({ json: [] });
      else
        await route.fulfill({
          status: 404,
          json: { message: `No fixture for ${url.pathname}` },
        });
    },
  );
  await page.goto("/watches/watch-1");
  await expect(
    page.getByRole("heading", { name: "Internship watch" }),
  ).toBeVisible();
  const mobile = page.viewportSize()!.width < 900;
  if (mobile)
    await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByText("Operator unlocked")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Search & analyze" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Compare sources" })).toHaveCount(
    0,
  );
  if (mobile) {
    await page
      .getByRole("button", { name: "Close navigation", exact: true })
      .first()
      .click();
    await expect(page.locator(".sidebar")).not.toBeInViewport();
  }
  await expect(
    page.getByRole("button", { name: "Default tiers", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await page
    .getByLabel("Watch name", { exact: true })
    .fill("Tiered internship radar");
  await page.getByLabel("Check every", { exact: true }).fill("45");
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText(
      "Changes are live. This update did not require a new baseline.",
    ),
  ).toBeVisible();
  expect(requests[0].headers["x-api-key"]).toBe("e2e-admin-key");
  expect(requests[0].body).toEqual({
    expectedUpdatedAt: UPDATED_AT,
    patch: { name: "Tiered internship radar", intervalMinutes: 45 },
  });

  await page.getByLabel("Tier 2 interval", { exact: true }).fill("35");
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".saved-pill")).toBeVisible();
  if (mobile) await page.getByLabel("Tier for Acme").selectOption("1");
  else
    await page
      .locator(".company-card")
      .filter({ hasText: "Acme" })
      .dragTo(page.getByRole("region", { name: "Tier 1", exact: true }));
  await expect(page.getByLabel("Tier for Acme")).toHaveValue("1");
  await page
    .getByRole("button", { name: "Default tiers", exact: true })
    .click();
  await expect(page.getByLabel("Tier for Acme")).toHaveValue("2");

  await page.getByText("Add company or source", { exact: true }).click();
  await page.getByLabel("Company to add", { exact: true }).fill("Beta");
  await page.getByRole("button", { name: "Add to watch" }).click();
  await expect(page.getByLabel("Tier for Beta")).toHaveValue("1");
  await page.getByRole("button", { name: "Remove Beta", exact: true }).click();
  await expect(page.getByLabel("Tier for Beta")).toHaveCount(0);

  await page.getByLabel("Tier for Acme").selectOption("3");
  await page.getByLabel("Tier 3 interval", { exact: true }).fill("60");
  await page.getByRole("button", { name: /Save changes/ }).click();
  const review = page.getByRole("dialog", { name: "Review changes" });
  await expect(review).toContainText("A fresh baseline is required");
  await review.getByRole("button", { name: /Apply .* changes/ }).click();
  await expect(
    page.getByText("Changes applied safely; watcher remains paused"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Run safe baseline", exact: true })
    .click();
  await expect(
    page.getByText("Baseline complete — ready to resume"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume watch", exact: true }).click();
  await expect(page.locator(".editor-header")).toContainText("Pause");
  expect(baselineRequested).toBe(true);
  expect(resumeRequested).toBe(true);
  expect(requests[2].body.patch.sourceTargets[0]).toMatchObject({
    tier: 3,
    intervalMinutes: 60,
  });
  expect(errors).toEqual([]);
});

function makeWatch() {
  return {
    id: "watch-1",
    name: "Internship watch",
    enabled: false,
    description: "A route-mocked operator E2E fixture",
    schedule: null,
    intervalMinutes: 30,
    timezone: "America/Toronto",
    sources: ["greenhouse"],
    sourceTiers: { greenhouse: 2 },
    sourceTargets: [
      {
        site: "greenhouse",
        companyName: "Acme",
        tier: 2,
        intervalMinutes: 30,
        resultsWanted: 50,
        enabled: true,
        initializedAt: "2026-08-04T11:00:00.000Z" as string | null,
      },
    ],
    targetHealth: {},
    companySlugs: [],
    companies: ["Acme"],
    searchTerms: ["software engineer intern"],
    requiredTerms: [],
    preferredTerms: ["TypeScript"],
    excludedTerms: ["senior"],
    locations: ["Toronto, ON"],
    countryCodes: ["CA"],
    allowedWorkplaceTypes: ["remote", "hybrid"],
    allowedEmploymentTypes: ["internship"],
    minimumScore: 60,
    urgentScore: 80,
    digestScore: 40,
    notificationChannels: [{ type: "discord", destinationRef: "default" }],
    notificationRoutes: [],
    initializationMode: "baseline",
    recentWindowMinutes: 180,
    weights: { role: 30 },
    initializedAt: "2026-08-04T11:00:00.000Z",
    lastRunAt: null,
    nextRunAt: null,
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: UPDATED_AT,
  };
}

test("partial baselines show and retry only the remaining targets", async ({
  page,
}) => {
  let watch = makeWatch();
  watch.sourceTargets.push({
    ...watch.sourceTargets[0],
    site: "shopify",
    companyName: "Shopify",
  });
  const attempts: string[][] = [];
  await page.addInitScript(() =>
    sessionStorage.setItem("radar.operator.api-key", "e2e-admin-key"),
  );
  await page.route("**/health", (route) =>
    route.fulfill({ json: { status: "healthy" } }),
  );
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/apply")) {
        watch = {
          ...watch,
          ...route.request().postDataJSON().patch,
          enabled: false,
          updatedAt: "2026-08-04T13:00:00Z",
          sourceTargets: watch.sourceTargets.map((t) => ({
            ...t,
            initializedAt: null,
          })),
        };
        await route.fulfill({
          json: {
            watch,
            diff: [],
            systemChanges: [],
            changed: true,
            behaviorChanged: true,
            paused: true,
            pausedByApply: true,
            resumeRequired: true,
            targetKeysRequiringInitialization: ["greenhouse", "shopify"],
          },
        });
      } else if (path.endsWith("/initialize")) {
        attempts.push(route.request().postDataJSON().targetKeys);
        watch = {
          ...watch,
          updatedAt: `2026-08-04T13:0${attempts.length}:00Z`,
          sourceTargets: watch.sourceTargets.map((t) => ({
            ...t,
            initializedAt:
              attempts.length > 1 || t.site === "greenhouse"
                ? "2026-08-04T13:00:00Z"
                : null,
          })),
        };
        await route.fulfill({
          json: {
            status: attempts.length === 1 ? "partial" : "completed",
            notificationsSent: 0,
          },
        });
      } else if (path === "/api/watches/watch-1")
        await route.fulfill({ json: watch });
      else if (path === "/api/watches/presets")
        await route.fulfill({ json: [] });
      else if (path === "/api/sources/health")
        await route.fulfill({ json: { count: 0, sources: [] } });
      else if (path === "/api/notification-destinations")
        await route.fulfill({ json: [] });
      else await route.fulfill({ status: 404, json: {} });
    },
  );
  await page.goto("/watches/watch-1");
  await page.getByLabel("Tier for Acme").selectOption("3");
  await page.getByRole("button", { name: /Save changes/ }).click();
  await page
    .getByRole("dialog", { name: "Review changes" })
    .getByRole("button", { name: /Apply .* changes/ })
    .click();
  await expect(page.locator(".activation-banner")).toContainText(
    "2 enabled targets",
  );
  await page
    .getByRole("button", { name: "Run safe baseline", exact: true })
    .click();
  await expect(page.locator(".activation-banner")).toContainText(
    "1 enabled targets",
  );
  await expect(page.locator(".activation-banner .target-key-list")).toHaveText(
    "shopify",
  );
  await expect(
    page.getByRole("button", { name: "Resume watch", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Run safe baseline", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume watch", exact: true }),
  ).toBeVisible();
  expect(attempts).toEqual([["greenhouse", "shopify"], ["shopify"]]);
});
