# Shopify careers source

`@rad-ar/source-company-shopify` is the direct Shopify internship source.
It uses only public pages on `https://www.shopify.com`:

- the public `/careers` route payload for the redesigned board, including roles beyond the first rendered page, or legacy server-rendered cards for public job/JID identity, title,
  discipline, location label, and canonical detail URL;
- each relevant public `/careers/<slug>_<jid>` route for its embedded public
  job record, genuine publication date, description, employment type, and
  official `/careers?ashby_jid=<jid>` application URL.

The plugin declares `watchMode: "board"`. It never guesses a Shopify Ashby
slug and never calls an Ashby API or private endpoint. Detail fetches are
bounded to five concurrent requests. The source returns only postings with
internship/co-op evidence and a software, engineering, ML/AI, data,
infrastructure/cloud/platform/SRE/DevOps, security, mobile, or developer-
experience discipline signal. Board filtering happens after the single board
fetch.

Stable IDs use `shopify-<public-jid>`. The original remote/regional label is
fed through the shared multi-location parser alongside structured public detail
locations, preserving both the compatibility `location` field and the complete
`locations[]` array.

HTTP errors, blocking pages, missing board/detail markers, and invalid public
records throw typed `HTTP`, `BLOCKED`, `MARKUP_CHANGED`, or `SCHEMA_INVALID`
failures. A board is a successful empty run only when the official careers
markers remain present and no job cards exist.

Deterministic tests cover legacy cards, the redesigned public roles payload, typed failures, and unsafe payload rejection.
The parser validates the official careers canonical URL and role identity before treating a redesigned board as successful.
Malformed or missing payloads remain failures rather than successful empty baselines.

The Canadian Tech + Adjacent Internships preset includes Shopify as an enabled target inside a globally disabled, uninitialized watch.
Complete a no-notification baseline before explicitly resuming the watch.
