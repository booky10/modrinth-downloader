import "dotenv/config.js";

import express from "express";
import CachingMap from "./CachingMap.js";
import cors from "cors";
import { slowDown } from "express-slow-down";

const rootRedir = process.env.ROOT_REDIR || "https://github.com/booky10/modrinth-downloader";
const apiUrl = process.env.API_URL || "https://api.modrinth.com";
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 8080);
const trustProxy = process.env.TRUST_PROXY || true;
const apiKey = process.env.MODRINTH_API_TOKEN || undefined;
const userAgent = process.env.USER_AGENT || "Modrinth Downloader V1 / https://github.com/booky10/modrinth-downloader / boooky10@gmail.com";

if (!apiKey) {
  console.warn("WARN: No MODRINTH_API_TOKEN has been supplied");
}

const logFetch = (url: string): string => {
  console.log(`Fetching ${url}`);
  return url;
};

// express setup
const app = express();
app.disable("x-powered-by");
if (trustProxy) {
  console.warn("WARN: Will be trusting proxy fowarding headers");
  app.set("trust proxy", true);
}

app.use(cors());
app.use(
  // allow 5 requests per 30s, then slow down
  // add 200ms delay per each additional request
  slowDown({
    windowMs: 30 * 1000,
    delayAfter: 5,
    delayMs: (hits) => hits * 200,
    validate: { trustProxy: false },
  })
);

// common logic
const respondVersion = async (versionJson: any, req: any, res: any, onError: (status: number, message: string) => void) => {
  const accept = req.header("Accept");
  const json = typeof req.query.json !== "undefined" || (accept && accept.includes("json"));

  const fileJson = versionJson.files.find((file) => file.primary);
  if (!fileJson && !json) {
    return onError(404, "no primary file found");
  }
  res.header("X-Version", versionJson.version_number);
  if (fileJson) {
    res.header("X-File-Size", fileJson.size);
    res.header("X-File-Sha1", fileJson.hashes.sha1);
    res.header("X-File-Sha512", fileJson.hashes.sha512);
  }

  if (json) {
    return res.status(fileJson ? 200 : 404).send(versionJson);
  }
  return res.redirect(303, fileJson.url);
};

// latest download route
class LatestCacheKey {
  project: string;
  loaders?: string[];
  game_versions?: string[];
  featured?: boolean;
}
const latestCacheMillis = 5 * 60 * 1000;
const latestCache: CachingMap<LatestCacheKey, object> = new CachingMap(latestCacheMillis);
app.get("/download/:project/latest", async (req, res) => {
  const project = req.params.project;
  const cacheKey: LatestCacheKey = { project };

  const query = new URLSearchParams();
  ["loaders", "game_versions", "featured"].forEach((key) => {
    const queryVal = req.query[key];
    if (typeof queryVal !== "undefined") {
      const queryValValid = JSON.parse(queryVal as string);
      cacheKey[key] = queryValValid;
      query.set(key, JSON.stringify(queryValValid));
    }
  });

  const onError = (status, message) => res.status(status).send({ project, status, message });
  const versionsJson = await latestCache.get(cacheKey, async () => {
    const resp = await fetch(logFetch(`${apiUrl}/v2/project/${project}/version?${query.toString()}`));
    if (resp.status !== 200) {
      onError(resp.status, "received invalid status code from modrinth");
      return undefined;
    }
    const versionsJson = await resp.json();
    if (versionsJson.length < 1) {
      onError(404, "no version found for query");
      return undefined;
    }
    return versionsJson;
  });
  if (versionsJson) {
    return await respondVersion(versionsJson[0], req, res, onError);
  }
});
// specific download route
const versionCacheMillis = 60 * 60 * 1000;
const versionCache: CachingMap<string, object> = new CachingMap(versionCacheMillis);
app.get("/download/:version", async (req, res) => {
  const version = req.params.version;
  const onError = (status, message) => res.status(status).send({ version, status, message });
  const versionJson = await versionCache.get(version, async () => {
    const resp = await fetch(logFetch(`${apiUrl}/v2/version/${version}`));
    if (resp.status !== 200) {
      onError(resp.status, "received invalid status code from modrinth");
      return undefined;
    }
    return await resp.json();
  });
  if (versionJson) {
    return await respondVersion(versionJson, req, res, onError);
  }
});
// add redirect on root
if (rootRedir) {
  app.get("/", (req, res) => res.redirect(rootRedir));
}

// boot process
app.listen(port, host);
console.log(`Startup done! Listening on ${port}`);
