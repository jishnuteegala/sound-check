# Cloudflare Pages deployment

Cloudflare Pages deploys the public site continuously from `main`; this repository does not store Cloudflare credentials or run deployment commands in GitHub Actions.

1. In Cloudflare Dashboard, open **Workers & Pages** and create a Pages project from `jishnuteegala/sound-check`.
2. Set production branch to `main`, build command to `pnpm run build`, and build output directory to `dist`.
3. Set the project name to `sound-check` and save. Cloudflare uses `wrangler.jsonc` and includes `public/_headers` in the generated `dist` output.
4. Under **Custom domains**, add `sound-check.jishnuteegala.com`; confirm the DNS record Cloudflare requests.
5. Confirm a push to `main` publishes the production deployment and the custom domain serves it over HTTPS.
