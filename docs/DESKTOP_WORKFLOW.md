# Knot Code Desktop Workflow

This project is now **desktop-first** (Tauri).

## Primary Commands

```bash
# Start desktop app for development
pnpm desktop:dev

# Type-check (run before commits)
pnpm desktop:check

# Production desktop build (DMG)
pnpm desktop:build

# Debug desktop build
pnpm desktop:build:debug

# Release flow (check + build)
pnpm desktop:release
```

## Quick Start (Daily)

1. Start app:
   ```bash
   pnpm desktop:dev
   ```
2. Make changes.
3. Validate before commit:
   ```bash
   pnpm desktop:check
   ```
4. Build when ready:
   ```bash
   pnpm desktop:build
   ```

## If Dev Gets Stuck

```bash
pnpm desktop:doctor
pnpm desktop:dev
```

`desktop:doctor` kills stale `next dev` / `tauri dev` processes and removes stale `.next/lock`.

## Notes

- Tauri uses:
  - `beforeDevCommand`: `pnpm frontend:dev`
  - `beforeBuildCommand`: `pnpm frontend:build`
- `dev`, `build`, and `check` aliases now map to desktop workflows.
- Web-only run scripts were removed on purpose.
