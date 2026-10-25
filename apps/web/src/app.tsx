import { Navigate, Route, Routes } from "react-router-dom";
import { type ReactNode } from "react";
import {
  isOperatorUiEnabled,
  OPERATOR_UI_MANIFEST,
} from "@rad-ar/ui-operator/manifest";
import { AppShell } from "./components/app-shell";
import { ComparePage } from "@rad-ar/ui-operator/browser/pages/compare-page";
import { MatchesPage } from "@rad-ar/ui-operator/browser/pages/matches-page";
import { NotificationsPage } from "@rad-ar/ui-operator/browser/pages/notifications-page";
import { OverviewPage } from "@rad-ar/ui-operator/browser/pages/overview-page";
import { SearchPage } from "@rad-ar/ui-operator/browser/pages/search-page";
import { SettingsPage } from "@rad-ar/ui-operator/browser/pages/settings-page";
import { WatchEditorPage } from "@rad-ar/ui-operator/browser/pages/watch-editor-page";
import { WatchesPage } from "@rad-ar/ui-operator/browser/pages/watches-page";

export function App() {
  if (!isOperatorUiEnabled(import.meta.env.VITE_UI_OPERATOR)) {
    return <OperatorUiDisabled />;
  }

  const routeElements: Record<string, ReactNode> = {
    overview: <OverviewPage />,
    watches: <WatchesPage />,
    notifications: <NotificationsPage />,
    matches: <MatchesPage />,
    search: <SearchPage />,
    compare: <ComparePage />,
    settings: <SettingsPage />,
  };
  return (
    <Routes>
      <Route element={<AppShell />}>
        {OPERATOR_UI_MANIFEST.navigation.map((item) =>
          item.path === "/" ? (
            <Route index element={routeElements[item.id]} key={item.id} />
          ) : (
            <Route
              path={item.path.slice(1)}
              element={routeElements[item.id]}
              key={item.id}
            />
          ),
        )}
        <Route path="watches/:watchId" element={<WatchEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function OperatorUiDisabled() {
  return (
    <main className="feature-disabled">
      <div className="brand__mark" aria-hidden="true" />
      <p className="eyebrow">Local operator</p>
      <h1>Operator GUI is disabled</h1>
      <p>
        Set <code>VITE_UI_OPERATOR=true</code> and restart the local stack to
        enable this surface. The API, watcher, CLI, and MCP remain available.
      </p>
    </main>
  );
}
