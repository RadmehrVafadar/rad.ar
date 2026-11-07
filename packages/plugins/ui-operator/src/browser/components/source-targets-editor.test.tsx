import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { WatchSourceTarget } from "../types";
import { SourceTargetsEditor } from "./source-targets-editor";

function Editor({
  initial,
  defaults = [],
}: {
  initial: WatchSourceTarget[];
  defaults?: WatchSourceTarget[];
}) {
  const [targets, setTargets] = useState(initial);
  return (
    <>
      <SourceTargetsEditor
        targets={targets}
        defaultTargets={defaults}
        sourceHealth={[]}
        defaultIntervalMinutes={20}
        defaultCountryCodes={["CA", "US"]}
        defaultLocations={["Toronto", "Remote"]}
        onChange={setTargets}
      />
      <output data-testid="targets-state">{JSON.stringify(targets)}</output>
    </>
  );
}

describe("SourceTargetsEditor watch defaults", () => {
  it("restores the template categorization without removing custom companies", async () => {
    const user = userEvent.setup();
    render(
      <Editor
        initial={[
          { site: "shopify", companyName: "Shopify", tier: 3, enabled: true },
          { site: "greenhouse", companyName: "Custom", tier: 2, enabled: true },
        ]}
        defaults={[
          { site: "shopify", companyName: "Shopify", tier: 1, enabled: true },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Default tiers" }));
    expect(screen.getByLabelText("Tier for Shopify")).toHaveValue("1");
    expect(screen.getByLabelText("Tier for Custom")).toHaveValue("2");
  });
  it("moves a company between tiers and sets a shared tier schedule", async () => {
    const user = userEvent.setup();
    render(
      <Editor
        initial={[
          {
            site: "google_careers",
            companyName: "Google",
            tier: 1,
            enabled: true,
          },
          {
            site: "linkedin",
            companyName: "LinkedIn",
            tier: 3,
            intervalMinutes: 60,
            enabled: true,
          },
        ]}
      />,
    );
    await user.selectOptions(screen.getByLabelText("Tier for Google"), "3");
    expect(screen.getByTestId("targets-state")).toHaveTextContent('"tier":3');
    const interval = screen.getByLabelText("Tier 3 interval");
    await user.clear(interval);
    await user.type(interval, "45");
    expect(
      JSON.parse(screen.getByTestId("targets-state").textContent!).map(
        (target: WatchSourceTarget) => target.intervalMinutes,
      ),
    ).toEqual([45, 45]);
    await user.click(screen.getByRole("button", { name: "Remove Google" }));
    expect(screen.getByTestId("targets-state")).not.toHaveTextContent(
      "google_careers",
    );
  });
  it("shows inherited cadence and supports a custom interval reset", async () => {
    const user = userEvent.setup();
    render(
      <Editor
        initial={[
          { site: "google", companyName: "Google", tier: 2, enabled: true },
        ]}
      />,
    );

    expect(screen.getByText("Every 20 min (default)")).toBeInTheDocument();
    await user.click(screen.getByText("Google"));
    const interval = screen.getByLabelText(/^Run interval/);
    await user.type(interval, "45");
    expect(screen.getByTestId("targets-state")).toHaveTextContent(
      '"intervalMinutes":45',
    );

    await user.click(screen.getByRole("button", { name: "Use watch default" }));
    expect(screen.getByTestId("targets-state")).not.toHaveTextContent(
      "intervalMinutes",
    );
  });

  it("creates and removes a country-only override independently", async () => {
    const user = userEvent.setup();
    render(
      <Editor
        initial={[
          { site: "google", companyName: "Google", tier: 2, enabled: true },
        ]}
      />,
    );
    await user.click(screen.getByText("Google"));

    await user.click(screen.getByRole("button", { name: "Remove US" }));
    expect(screen.getByTestId("targets-state")).toHaveTextContent(
      '"countryCodes":["CA"]',
    );
    expect(screen.getByTestId("targets-state")).not.toHaveTextContent(
      "locations",
    );

    await user.click(
      screen.getByRole("button", { name: "Use watch country codes" }),
    );
    expect(screen.getByTestId("targets-state")).not.toHaveTextContent(
      "searchScope",
    );
  });

  it("bulk-restores shared defaults without dropping target-only settings", async () => {
    const user = userEvent.setup();
    render(
      <Editor
        initial={[
          {
            site: "google",
            companyName: "Google",
            tier: 2,
            intervalMinutes: 60,
            enabled: true,
            searchScope: {
              countryCodes: ["CA"],
              locations: ["Toronto"],
              strictLocations: true,
              searchTerms: ["software intern"],
              maxRequestsPerRun: 2,
            },
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Use watch schedule and geography for all",
      }),
    );
    const state = screen.getByTestId("targets-state");
    expect(state).not.toHaveTextContent("intervalMinutes");
    expect(state).not.toHaveTextContent("countryCodes");
    expect(state).not.toHaveTextContent("locations");
    expect(state).toHaveTextContent('"searchTerms":["software intern"]');
    expect(state).toHaveTextContent('"maxRequestsPerRun":2');
  });
});

it("allows configuring the employer board URL for sources such as Yello", async () => {
  const user = userEvent.setup();
  render(
    <Editor
      initial={[
        {
          site: "yello",
          companyName: "EY Canada",
          companySlug: "test-board",
          tier: 1,
          enabled: true,
        },
      ]}
    />,
  );
  await user.click(screen.getByText("EY Canada", { exact: true }));
  await user.type(
    screen.getByLabelText(/^Board URL/),
    "https://eyglobal.yello.co",
  );
  expect(
    JSON.parse(screen.getByTestId("targets-state").textContent!)[0].companyUrl,
  ).toBe("https://eyglobal.yello.co");
});
