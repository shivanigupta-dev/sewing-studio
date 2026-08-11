import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const DEFAULT_URLS = ["http://localhost:3000", "http://127.0.0.1:3000"];

async function checkedFetch(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  assert.equal(response.ok, true, `${url} returned HTTP ${response.status}`);
  return response;
}

export async function verifyLocalhost(baseUrl) {
  const root = baseUrl.replace(/\/$/, "");
  const page = await checkedFetch(root);
  assert.match(page.headers.get("content-type") ?? "", /text\/html/i, "The root response is not HTML");
  const html = await page.text();
  assert.match(html, /Sewing Studio|Threading your project/i, "The application shell is missing");
  const assets = Array.from(html.matchAll(/(?:src|href)="([^"]+_next\/static\/[^"]+)"/g), (match) => new URL(match[1], `${root}/`).href);
  assert.ok(assets.length > 0, "No static Next assets were linked from the page");
  await Promise.all(assets.slice(0, 4).map(checkedFetch));
  const worker = await checkedFetch(`${root}/sw.js`);
  assert.match(worker.headers.get("content-type") ?? "", /javascript|text\/plain/i, "The offline worker is missing");
  console.log(`✓ ${root} serves the static, local-first application`);
  return { baseUrl: root, assetCount: assets.length };
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  const targets = process.env.SEWING_STUDIO_URL ? [process.env.SEWING_STUDIO_URL] : DEFAULT_URLS;
  Promise.all(targets.map(verifyLocalhost)).then((results) => console.log(`\nLocal verification passed for ${results.map((result) => result.baseUrl).join(" and ")}.`)).catch((error) => {
    console.error(`\nLocal verification failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error("Start Sewing Studio, then retry: mise run verify-localhost");
    process.exitCode = 1;
  });
}
