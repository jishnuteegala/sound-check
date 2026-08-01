# Sound Check Card

[![CI](https://github.com/jishnuteegala/sound-check-card/actions/workflows/ci.yml/badge.svg)](https://github.com/jishnuteegala/sound-check-card/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/jishnuteegala/sound-check-card?display_name=tag)](https://github.com/jishnuteegala/sound-check-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-111827.svg)](LICENSE)

Sound Check Card answers the question behind "microphone not working in meetings", "mic check before call", and "am I too quiet on calls": is the microphone signal itself ready before the call starts? It is a private, browser-only microphone check that gives a plain PASS or CHECK verdict before Zoom, Meet, Teams, or another call app gets involved.

## What it does

Start the check, allow microphone access, choose an input when the browser exposes one, and follow a brief quiet period and speaking period. The browser measures:

- Input presence.
- Speaking level.
- Clipping.
- Room noise while you are quiet.
- Browser-provided processing signals.

PASS means each measurement is within the tool's conservative operating range. CHECK means one or more measurements need attention: no input, a quiet signal, clipping, excessive room noise, or browser processing. A PASS does not guarantee that a meeting app will not apply its own processing or have its own device setting.

Audio is processed entirely in the browser. It is never uploaded, stored, or retained by the site. Sound Check Card uses no analytics, cookies, accounts, advertising, forms, or third-party requests.

## Browser support

Use a current Chrome, Edge, Firefox, or Safari browser with microphone permission, `getUserMedia`, Web Audio, and MediaRecorder support. Desktop browsers can expose an input selector; mobile browsers commonly use the operating system's default input.

## Development

Requires Node 22+ and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm run check
pnpm run build
pnpm run verify:preview
```

| Command                   | What it does                                                               |
| ------------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`                | Starts the local development server.                                       |
| `pnpm run build`          | Type-checks and creates the static `dist/` bundle.                         |
| `pnpm run preview`        | Serves the built bundle locally.                                           |
| `pnpm run verify:preview` | Starts preview, verifies the built app and strict Pages CSP, then exits.   |
| `pnpm run lint`           | Runs oxlint.                                                               |
| `pnpm run format`         | Checks formatting with oxfmt.                                              |
| `pnpm run typecheck`      | Type-checks without emitting files.                                        |
| `pnpm run test`           | Runs the test suite.                                                       |
| `pnpm run check`          | Runs lint, format, typecheck, tests, and the `llms.txt` consistency check. |

## Agents and scripts

The app has no server-side audio processing. Agents can run `pnpm run check` for the full quality gate and `pnpm run verify:preview` after a build to exercise the generated static bundle without leaving a server running. `scripts/package_release.py` creates stable zip and tarball release archives using the release tag commit time. `llms.txt` and `public/llms.txt` are intentionally identical; `pnpm run check:llms` verifies that contract.

## Deployment

The public app deploys continuously from `main` to [sound-check.jishnuteegala.com](https://sound-check.jishnuteegala.com) through Cloudflare Pages. The one-time dashboard connection is documented in [docs/agents/deploy.md](docs/agents/deploy.md). No Cloudflare credentials are stored in this repository.

## Self-hosting

Use a tagged GitHub Release rather than an arbitrary commit. Every release includes prebuilt `sound-check-card-<version>.zip` and `.tar.gz` static bundles plus `SHA256SUMS`.

### 1. Download and verify

```sh
VERSION=0.1.0
curl -fLO "https://github.com/jishnuteegala/sound-check-card/releases/download/v$VERSION/sound-check-card-$VERSION.tar.gz"
curl -fLO "https://github.com/jishnuteegala/sound-check-card/releases/download/v$VERSION/SHA256SUMS"
sha256sum --check --ignore-missing SHA256SUMS
mkdir -p sound-check-card && tar -xzf "sound-check-card-$VERSION.tar.gz" -C sound-check-card
```

The extracted archive is a static site with hash-based navigation. It needs no SPA fallback or rewrite rule.

### 2. Pick a host

**Cloudflare Pages**

Create a Pages project in the Cloudflare dashboard and direct-upload the extracted `sound-check-card/` directory. For Git integration, use build command `pnpm run build` and output directory `dist`; `public/_headers` is included automatically. Add your custom domain in Pages after the first deploy.

**Vercel**

Create a new Vercel project and upload the extracted directory as a static deployment, or connect the repository with build command `pnpm run build` and output directory `dist`.

**Netlify**

Create a Netlify site by dragging the extracted directory into the deploy dropzone, or connect the repository with build command `pnpm run build` and publish directory `dist`.

**GitHub Pages**

Publish the extracted directory from a `gh-pages` branch:

```sh
git checkout --orphan gh-pages
git rm -rf .
cp -R sound-check-card/. .
git add -A
git commit -m "deploy sound-check-card"
git push origin gh-pages
```

Enable Pages for the `gh-pages` branch in repository settings. Use a custom domain or a root site because the bundle is built with base `/`; a project-path URL requires rebuilding with a matching Vite `base` value.

**VPS with nginx**

```nginx
server {
    listen 80;
    server_name sound-check.example.com;
    root /var/www/sound-check-card;
    index index.html;
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

Copy the extracted files to `/var/www/sound-check-card` and reload nginx.

**VPS with Caddy**

```caddy
sound-check.example.com {
    root * /var/www/sound-check-card
    file_server
}
```

**Docker**

```dockerfile
FROM nginx:alpine
COPY sound-check-card/ /usr/share/nginx/html/
EXPOSE 80
```

```sh
docker build -t sound-check-card .
docker run --rm -p 8080:80 sound-check-card
```

Or run the extracted bundle directly:

```sh
docker run --rm -p 8080:80 -v "$PWD/sound-check-card:/usr/share/nginx/html:ro" nginx:alpine
```

## Releases

[Release Please](https://github.com/googleapis/release-please) maintains a reviewed release PR from Conventional Commits. Merging that PR creates a version tag and draft GitHub Release. The release workflow builds, checksums, uploads, and then publishes the static archives. It uses the repository's built-in `GITHUB_TOKEN`; release PRs are never auto-merged.

## License

MIT - see [LICENSE](LICENSE).
