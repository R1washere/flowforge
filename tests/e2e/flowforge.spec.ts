import { expect, request, test, type Page } from "@playwright/test";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4200/api";

const routes = [
  { path: "/", heading: "Automation command center" },
  { path: "/workflows", heading: "Workflows" },
  { path: "/builder", heading: "Customer onboarding" },
  { path: "/executions", heading: "Execution logs" },
  { path: "/governance", heading: "Governance" },
  { path: "/team", heading: "Team & roles" },
  { path: "/login", heading: "Choose demo access" },
];

test.beforeAll(async () => {
  await waitForApi();
});

test("demo workspace renders core pages without layout overflow", async ({
  page,
}) => {
  for (const route of routes) {
    await page.goto(route.path);
    await expect(
      page.getByRole("heading", { exact: true, name: route.heading }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page, route.path);
  }
});

test("operator can run workflows but viewer cannot mutate protected resources", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Alex Automation/ }).click();
  await expect(page.getByText("operator session")).toBeVisible();

  await page.goto("/workflows");
  await page.getByRole("button", { exact: true, name: "Run" }).first().click();
  await expect(page.getByText(/Latest run:/)).toBeVisible();

  await page.goto("/login");
  await page.getByRole("button", { name: /Nina Finance/ }).click();
  await expect(page.getByText("viewer session")).toBeVisible();

  await page.goto("/workflows");
  await page
    .getByRole("button", { exact: true, name: "Pause" })
    .first()
    .click();
  await expect(
    page.getByText(/does not have required permissions|Forbidden|permissions/i),
  ).toBeVisible();

  await assertNoHorizontalOverflow(page, "/workflows viewer permission error");
});

test("builder, scheduler, governance, and team actions respond", async ({
  page,
}) => {
  await loginAsOwner(page);

  await page.goto("/");
  const runDueButton = page.getByRole("button", { name: "Run due" });
  if (await runDueButton.isEnabled()) {
    await runDueButton.click();
    await expect(page.getByText(/schedule\(s\) processed/)).toBeVisible();
  }

  await page.goto("/governance");
  await page.getByRole("button", { name: "Check health" }).click();
  await expect(page.getByText(/integration\(s\) checked/)).toBeVisible();

  await page.goto("/builder");
  await page.getByRole("button", { name: "Run selected workflow" }).click();
  await expect(page.getByText(/Latest run:/)).toBeVisible();

  await page.goto("/team");
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Role policies" }),
  ).toBeVisible();

  await assertNoHorizontalOverflow(page, "interactive owner journey");
});

async function waitForApi() {
  const context = await request.newContext();
  const deadline = Date.now() + 30_000;

  try {
    while (Date.now() < deadline) {
      try {
        const response = await context.get(`${apiBaseUrl}/health`);

        if (response.ok()) {
          return;
        }
      } catch {
        // The NestJS server can need a short warm-up when Playwright starts dev.
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } finally {
    await context.dispose();
  }

  throw new Error(`API did not become ready at ${apiBaseUrl}/health`);
}

async function loginAsOwner(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /Demo Operator/ }).click();
  await expect(page.getByText("owner session")).toBeVisible();
}

async function assertNoHorizontalOverflow(page: Page, route: string) {
  const audit = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    );

    const offenders = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) {
          return false;
        }

        if (rect.left >= -1 && rect.right <= viewportWidth + 1) {
          return false;
        }

        return !hasScrollableAncestor(element);
      })
      .slice(0, 10)
      .map((element) => {
        const rect = element.getBoundingClientRect();

        return {
          className: String((element as HTMLElement).className || ""),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          tag: element.tagName.toLowerCase(),
          text: (element.textContent ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 90),
          width: Math.round(rect.width),
        };
      });

    return {
      documentWidth,
      offenders,
      viewportWidth,
    };

    function hasScrollableAncestor(element: Element) {
      let parent = element.parentElement;

      while (parent && parent !== document.body) {
        const styles = getComputedStyle(parent);
        const canScrollX =
          ["auto", "scroll"].includes(styles.overflowX) &&
          parent.scrollWidth > parent.clientWidth + 1;

        if (canScrollX) {
          return true;
        }

        parent = parent.parentElement;
      }

      return false;
    }
  });

  expect(audit, `${route} should not overflow horizontally`).toEqual({
    documentWidth: audit.viewportWidth,
    offenders: [],
    viewportWidth: audit.viewportWidth,
  });
}
