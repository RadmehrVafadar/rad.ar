# rad.ar Mac Mini Cheat Sheet

## Open the checkout

```bash
source ~/.zshrc
cd ~/repo/radar
```

Use the `prod` branch for production updates.

## Update and start

Stop the existing GUI with Ctrl+C first.
Run each command separately and stop if one fails.

```bash
git pull --ff-only
npm ci
npm run gui
```

`npm run gui` applies database migrations, generates Prisma when needed, builds the API, watcher, and web GUI, and starts them.
No separate database-generation, migration, or build commands are needed for the GUI.
Open `http://localhost:3000` and keep the terminal running.
Logs appear in that terminal; Ctrl+C stops the stack.

## If the old background watcher is running

Unload it before starting the GUI to avoid a port conflict.
Run this as the macOS user that owns the LaunchAgent:

```bash
launchctl bootout gui/$(id -u)/com.radar.watcher
```

Skip this if the LaunchAgent is already unloaded.

## Check health

From another terminal:

```bash
curl -fsS http://localhost:3002/health
```

Expect `status: healthy`, `database: true`, scheduler `enabled: true` and `started: true`, and `lastError: null`.

## More detail

- [Watcher operations](watcher-local.md) - watch management, backups, and troubleshooting.
- [Watcher reference](../../apps/watcher/README.md) - configuration and runtime behavior.
