"""Vercel Python serverless entry point.

Vercel detects this file and serves the exported `app` (an ASGI FastAPI
application) as a Fluid Compute function. All `/api/*` routes are handled here
via the rewrite in vercel.json. The real implementation lives in the `helix`
package at the repo root.
"""

from helix.api import app  # noqa: F401  (re-exported for Vercel)
