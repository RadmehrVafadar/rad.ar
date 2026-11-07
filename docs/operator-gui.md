# Operator GUI

The local GUI manages watches, company tiers, matches, and notifications.

## Update and start

Stop the existing GUI, then run these commands from the production checkout:

```bash
git pull --ff-only
npm ci
npm run gui
```

The launcher applies migrations, generates Prisma when necessary, builds the API, watcher, and web GUI, and starts the stack.
The launcher resolves Nx through its published package executable for builds and web preview rather than a version-specific internal file path.
Open `http://localhost:3000` and keep the terminal running.
Keep the separate watcher LaunchAgent unloaded while the GUI stack is running.

## Company tiers and schedules

Open Watches and choose Edit watch.
The Companies & schedule tab shows the three-tier board.
Drag a company into another tier or use its tier dropdown, which also works with touch and keyboard input.
All boards belonging to the same company move together.
Moving a company to a tier with a uniform schedule applies that destination schedule.
If the destination has mixed schedules, the company's existing schedule is preserved until a common interval is chosen.

Set a tier's interval in minutes to update every source in that tier.
Mixed intervals are shown explicitly instead of silently replacing existing custom schedules.
An empty tier takes its first company's current schedule; inherited intervals use the watch default.
Tier intervals are stored using the existing per-source interval fields.

Default tiers restores the retained template's company categorization while keeping custom companies.
Add company or source offers the template's companies and their configured boards; custom sources can be entered manually.
Removing a company removes all its boards and its derived company filters from the draft.
Unrelated operator-authored company filters remain intact.

## Save changes

Edits remain in the draft until Save changes is selected.
Names and schedule-only changes save directly without pausing or discarding baselines.
An interval change preserves source runtime state and recalculates its next due time from its last run.
Company, tier, filter, and scoring changes show a review, pause the watch, and require a safe baseline before explicit resume.
After a partial baseline, the banner and retry use the saved initialization state and include only remaining enabled targets.
A completed subset does not enable resume while other targets still need initialization.
Company source settings include a Board URL field for adapters such as Yello that require an explicit employer origin.
Stale drafts are rejected using the saved watch's version rather than overwriting newer edits.

Filters, alert routing, and activity have their own tabs.
Scoring, JSON import/export, and preset application are under More options.
Search/analyze and source comparison have been removed from the GUI; their REST and CLI interfaces remain available.
Only Canadian Tech + Adjacent Internships remains selectable as a template and as the fresh-install default.

## Notification presentation and reposts

Discord alerts show the score once and omit the Watch field.
Company, role, urgency, reasons, location, workplace, employment, source, publication and detection timestamps, delay, and application links remain present.
Repeated employment labels are combined into readable values.

LinkedIn listing URLs and refreshed publication dates do not define a new employer posting.
For LinkedIn jobs without a real employer application URL, identical normalized company, title, and location reuse a recently seen episode across new listing IDs.
The rolling lookback is 14 days since the last sighting; a known unchanged source ID retains its original episode even after that window.
Legacy observations whose earlier keys included LinkedIn URLs are included in that lookup, preserving existing sent matches.
Different employer requisition URLs remain separate, and source observations are retained for provenance.
A new listing ID after more than 14 days without a sighting may represent a fresh episode.

## Key files

- `packages/plugins/ui-operator/src/browser/components/source-targets-editor.tsx` - company board and tier intervals.
- `packages/plugins/ui-operator/src/browser/lib/watch-draft.ts` - draft updates and change classification.
- `packages/plugins/watch-engine/src/management/watch-apply.service.ts` - atomic saves and baseline safety.
- `packages/plugins/watch-engine/src/services/job-fingerprint.service.ts` - posting identity.
- `packages/plugins/notification-discord/src/discord-notification.provider.ts` - Discord presentation.

## Related

- [Mac cheat sheet](runbooks/mac-mini-production-cheat-sheet.md)
- [Watcher operations](runbooks/watcher-local.md)
