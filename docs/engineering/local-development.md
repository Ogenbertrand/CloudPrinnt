# Local development

## Foundation only

This delivery creates architecture, source boundaries, and generated Android, iOS, web, and desktop Flutter runners. API routes, migrations, provider calls, and printing have not been implemented. There is deliberately no `npm run dev` claiming to start a working service.

Prerequisites: Node.js 22 or newer, npm, Python 3 for the diagram tools, Flutter with Dart 3.12.2 or compatible, and Docker Compose only if you want the local databases. Flutter 3.44.8 generated the platform runners. Do not upgrade the SDK merely to reproduce the diagrams.

## TypeScript

```sh
npm ci
npm run check
npm run build
```

Workspaces use TypeScript project references with separate `dist/` outputs. `check` performs the same strict project-reference compilation as build. The packages expose compiled JavaScript and declarations; build dependencies before importing them. No provider SDKs are installed until their integration phase.

## Flutter

```sh
cd apps/cloudprint_app
flutter pub get
flutter analyze
flutter test
flutter run -d chrome
```

The foundation screen runs as a Flutter application and identifies whether a target can host the printer bridge. Run Android/iOS builds on their supported toolchains and Windows/macOS builds on those operating systems. Analysis on Linux does not prove native builds or real printer compatibility.

## Optional development data services

```sh
docker compose -f infra/docker/compose.dev.yml up -d
```

The Compose file starts only PostgreSQL and Redis on localhost. Its password is a development placeholder. Check for port conflicts first. `docker compose ... down` stops services; do not add `-v` unless you intend to delete local data volumes.

Copy `.env.example` to `.env` when wiring a service; live credentials must never be committed. The example is a future configuration contract, not an active connection. The private document directory is ignored by Git.

## Architecture editing

Open `docs/architecture/cloudprint-architecture.drawio` in draw.io Desktop or the diagrams.net editor. All five pages contain editable native shapes and connectors.

```sh
python3 scripts/generate-architecture.py
python3 scripts/render-architecture-preview.py
python3 scripts/validate-architecture.py
```

The generator recreates the diagram from its source specification and overwrites direct editor changes. The preview script writes the first-page PNG used in the documentation. Preserve direct editor edits or update the generator before regenerating. Structural validation checks IDs, parents, edges, geometry, workspace JSON, and generated platform directories; it does not validate product behavior.
