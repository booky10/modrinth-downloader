# Modrinth Downloader

A simple Express-based http server for redirecting download links to the latest version of a project.
Can be easily self-hosted, a hosted version is available at [modrinth.booky.dev](https://modrinth.booky.dev/).

## Self-hosting

NodeJS must be installed. If the yarn package manager is not installed, replace `yarn` with `.yarn/releases/*` in the following commands.

1. Clone this repository
2. Create a `.env` file and configure it
3. Run `yarn install` to install dependencies
4. Run `yarn run build` to build the final script
5. Run `yarn run start:prod` to start the web process

## Environment variables

- `ROOT_REDIR`: The url to redirect to at the `/` route
  - Default: `https://github.com/booky10/modrinth-downloader`
- `API_URL`: The modrinth api url. May be changed to the staging api, but should generally stay at the default value. Do not include trailing slashes!
  - Default: `https://api.modrinth.com`
- `HOST`: The host to bind on.
  - Default: `0.0.0.0`
- `PORT`: The port to bind on.
  - Default: `8080`
- `TRUST_PROXY`: Wether to trust headers sent by the client revealing the real client address. Required for rate-limiting to work correctly with e.g. Cloudflare Proxy enabled.
  - Default: `false`
- `MODRINTH_API_TOKEN`: Optional, the modrinth api token. Required for private projects to be available, otherwise not needed.
  - Default: _none_
- `USER_AGENT`: A user agent identifying the instance. The email address should be changed for potential contact info.
  - Default: `Modrinth Downloader / https://github.com/booky10/modrinth-downloader / contact@example.org`

## Available Routes

All routes have a rate-limit of 5 requests per 30s, per ip. After this, every request will get delayed by an additional 200ms.

### `/`

This just redirects to this GitHub repository, or another URL if changed.

Example: https://modrinth.booky.dev/

### `/download/{version}`

Redirects to the download URL of the primary file for the specified version. The response gets cached for one hour.

If you want Modrinth's JSON response instead of a redirect, set the `Accept` header to `application/json` or add `?json` to the query parameters.

Example (Download): https://modrinth.booky.dev/download/pyiVLk9R <br>
Example (Json): https://modrinth.booky.dev/download/pyiVLk9R?json

### `/download/{project}/latest`

Redirects to the download URL of the primary file for the latest version of the specified project. The response gets cached for 5min.

If you want Modrinth's JSON response instead of a redirect, set the `Accept` header to `application/json` or add `?json` to the query parameters.

Additionally, this endpoint also allows filtering of versions. Currently supported are `loaders`, `game_versions` and `featured`. See the [Modrinth API Docs](https://docs.modrinth.com/#tag/versions/operation/getProjectVersions) for more info on how to use these.

Example (Download): https://modrinth.booky.dev/download/stackdeobf/latest <br>
Example (Json): https://modrinth.booky.dev/download/stackdeobf/latest?json
