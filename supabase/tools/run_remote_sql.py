#!/usr/bin/env python3
"""Run a SQL file against a remote Supabase project via the Management API.

Used for staging/production deploys where no direct psql connection is
configured. Reads SUPABASE_ACCESS_TOKEN from the environment.

    python3 supabase/tools/run_remote_sql.py <project-ref> <file.sql> [...]

Each file is sent as a single statement batch, so a file that opens its own
transaction keeps its transactional semantics. Exits non-zero on the first
failure so callers can stop a migration run mid-way.
"""

import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.supabase.com/v1/projects/{ref}/database/query"


def run_sql(ref: str, token: str, sql: str):
    request = urllib.request.Request(
        API.format(ref=ref),
        data=json.dumps({"query": sql}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            # The API sits behind a WAF that rejects the default urllib agent.
            "User-Agent": "yp-deploy-tools/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2

    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        print("SUPABASE_ACCESS_TOKEN is not set.", file=sys.stderr)
        return 2

    ref, paths = sys.argv[1], sys.argv[2:]
    for path in paths:
        with open(path, "r", encoding="utf-8") as handle:
            sql = handle.read()
        try:
            run_sql(ref, token, sql)
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")
            print(f"FAIL {path}\n{detail}", file=sys.stderr)
            return 1
        print(f"ok   {path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
