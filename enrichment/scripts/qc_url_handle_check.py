"""Batch 1 QC: HEAD-check websites and resource_urls; validate Twitter and Bluesky handles.

Outputs a markdown audit report at logs/audits/qc-urls-handles-{date}.md.
Read-only: does not mutate the DB.

Concurrency: ThreadPoolExecutor with 20 workers. Per-request timeout: 10s.
Twitter check uses cdn.syndication.twimg.com JSON endpoint.
Bluesky check uses public.api.bsky.app resolveHandle XRPC endpoint.
"""
import os
import json
import ssl
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REPORT_PATH = os.path.join(REPO_ROOT, 'logs', 'audits', f'qc-urls-handles-{datetime.now().strftime("%Y%m%d")}.md')

UA = 'Mozilla/5.0 (compatible; mapping-ai-qc/1.0; +https://mappingai.org)'
TIMEOUT = 10
WORKERS = 20

# Hosts that routinely reject HEAD or our UA — just mark as "skipped/manual"
SKIP_HOSTS = set()

ssl_ctx = ssl.create_default_context()


def http_status(url, method='HEAD'):
    """Return (status_code, final_url, error_str). None on network failure."""
    try:
        req = urllib.request.Request(url, method=method, headers={'User-Agent': UA, 'Accept': '*/*'})
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ssl_ctx) as resp:
            return (resp.status, resp.url, None)
    except urllib.error.HTTPError as e:
        return (e.code, url, None)
    except urllib.error.URLError as e:
        return (None, url, f'URLError: {e.reason}')
    except ssl.SSLError as e:
        return (None, url, f'SSLError: {e}')
    except Exception as e:
        return (None, url, f'{type(e).__name__}: {e}')


def check_url(url):
    """HEAD first; if 405/403 or method failure, retry GET."""
    status, final_url, err = http_status(url, 'HEAD')
    if status in (405, 403, 501) or (status is None and 'method' in (err or '').lower()):
        status, final_url, err = http_status(url, 'GET')
    return {'url': url, 'status': status, 'final_url': final_url, 'error': err}


def check_twitter(handle):
    h = handle.lstrip('@').strip()
    if not h or h.lower() in ('unknown', 'none'):
        return {'handle': handle, 'valid': None, 'note': 'placeholder'}
    # Use syndication timeline-profile endpoint. Valid users return ~100k–500k HTML
    # with embedded tweet data; invalid users return a ~2k stub.
    # The endpoint rate-limits aggressively (~20 req/s will trip 429); use retries.
    url = f'https://syndication.twitter.com/srv/timeline-profile/screen-name/{urllib.parse.quote(h)}'
    backoff = 2
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=TIMEOUT, context=ssl_ctx) as resp:
                body = resp.read()
                n = len(body)
                if n >= 10000:
                    return {'handle': handle, 'valid': True, 'note': f'size={n}'}
                return {'handle': handle, 'valid': False, 'note': f'size={n} (not-found stub)'}
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 4:
                time.sleep(backoff)
                backoff *= 2
                continue
            return {'handle': handle, 'valid': False if e.code != 429 else None, 'note': f'HTTP {e.code}'}
        except Exception as e:
            if attempt < 4:
                time.sleep(backoff)
                backoff *= 2
                continue
            return {'handle': handle, 'valid': None, 'note': f'error: {type(e).__name__}: {e}'}
    return {'handle': handle, 'valid': None, 'note': 'retries exhausted'}


def check_bluesky(handle):
    h = handle.lstrip('@').strip()
    if not h:
        return {'handle': handle, 'valid': None, 'note': 'empty'}
    url = f'https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle={urllib.parse.quote(h)}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ssl_ctx) as resp:
            data = json.loads(resp.read())
            if 'did' in data:
                return {'handle': handle, 'valid': True, 'note': data['did']}
            return {'handle': handle, 'valid': False, 'note': 'no did returned'}
    except urllib.error.HTTPError as e:
        return {'handle': handle, 'valid': False, 'note': f'HTTP {e.code}'}
    except Exception as e:
        return {'handle': handle, 'valid': None, 'note': f'error: {type(e).__name__}: {e}'}


def main():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    cur.execute("""
      SELECT id, name, entity_type, website FROM entity
      WHERE website IS NOT NULL AND website <> ''
    """)
    websites = cur.fetchall()
    cur.execute("""
      SELECT id, name, entity_type, resource_url FROM entity
      WHERE resource_url IS NOT NULL AND resource_url <> ''
    """)
    rurls = cur.fetchall()
    cur.execute("""
      SELECT id, name, entity_type, twitter FROM entity
      WHERE twitter IS NOT NULL AND twitter <> ''
    """)
    twitters = cur.fetchall()
    cur.execute("""
      SELECT id, name, entity_type, bluesky FROM entity
      WHERE bluesky IS NOT NULL AND bluesky <> ''
    """)
    blueskys = cur.fetchall()
    conn.close()

    print(f"websites={len(websites)} resource_urls={len(rurls)} twitters={len(twitters)} blueskys={len(blueskys)}")

    # URLs
    url_items = [(r, 'website') for r in websites] + [(r, 'resource_url') for r in rurls]
    results_urls = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(check_url, r[0][3]): r for r in url_items}
        for fut in as_completed(futs):
            (eid, name, etype, url), kind = futs[fut]
            out = fut.result()
            out.update({'id': eid, 'name': name, 'entity_type': etype, 'kind': kind})
            results_urls.append(out)
    print(f"URL checks done in {time.time()-t0:.1f}s")

    # Twitter — low concurrency to avoid 429s; syndication endpoint rate-limits hard
    results_tw = []
    t0 = time.time()
    TW_WORKERS = 3
    with ThreadPoolExecutor(max_workers=TW_WORKERS) as ex:
        futs = {ex.submit(check_twitter, r[3]): r for r in twitters}
        for fut in as_completed(futs):
            (eid, name, etype, handle) = futs[fut]
            out = fut.result()
            out.update({'id': eid, 'name': name, 'entity_type': etype})
            results_tw.append(out)
    print(f"Twitter checks done in {time.time()-t0:.1f}s")

    # Bluesky
    results_bs = []
    for eid, name, etype, handle in blueskys:
        out = check_bluesky(handle)
        out.update({'id': eid, 'name': name, 'entity_type': etype})
        results_bs.append(out)
    print(f"Bluesky checks done")

    # Write report
    def bucket_url(r):
        s = r.get('status')
        if s is None: return 'error'
        if 200 <= s < 300: return 'ok'
        if 300 <= s < 400: return 'redirect'
        if s == 404: return '404'
        if s in (403, 401): return 'forbidden'
        return 'other'

    from collections import Counter
    url_buckets = Counter(bucket_url(r) for r in results_urls)
    tw_buckets = Counter((True if r['valid'] else (False if r['valid'] is False else 'unknown')) for r in results_tw)
    bs_buckets = Counter((True if r['valid'] else (False if r['valid'] is False else 'unknown')) for r in results_bs)

    lines = []
    lines.append(f"# URL + Handle Audit — {datetime.now().strftime('%Y-%m-%d')}\n")
    lines.append(f"Sources: `website` + `resource_url` HEAD/GET checks; Twitter via cdn.syndication.twimg.com; Bluesky via public.api.bsky.app.\n")
    lines.append(f"## Summary\n")
    lines.append(f"- **URLs:** {len(results_urls)} checked — ok {url_buckets.get('ok',0)}, redirect {url_buckets.get('redirect',0)}, 404 {url_buckets.get('404',0)}, forbidden {url_buckets.get('forbidden',0)}, other {url_buckets.get('other',0)}, error {url_buckets.get('error',0)}")
    lines.append(f"- **Twitter:** {len(results_tw)} checked — valid {tw_buckets.get(True,0)}, invalid {tw_buckets.get(False,0)}, unknown {tw_buckets.get('unknown',0)}")
    lines.append(f"- **Bluesky:** {len(results_bs)} checked — valid {bs_buckets.get(True,0)}, invalid {bs_buckets.get(False,0)}, unknown {bs_buckets.get('unknown',0)}\n")

    lines.append("## URL Failures (404 / error / forbidden)\n")
    lines.append("| id | kind | entity | status | url | note |")
    lines.append("|---:|------|--------|-------:|-----|------|")
    fails = [r for r in results_urls if bucket_url(r) in ('404','error','forbidden','other')]
    fails.sort(key=lambda r: (r['kind'], r.get('status') or -1, r['id']))
    for r in fails:
        note = (r.get('error') or '').replace('|','\\|')[:60]
        lines.append(f"| {r['id']} | {r['kind']} | {r['name'][:40]} | {r.get('status')} | {r['url'][:80]} | {note} |")

    lines.append("\n## Twitter Invalid\n")
    lines.append("| id | entity | handle | note |")
    lines.append("|---:|--------|--------|------|")
    for r in [r for r in results_tw if r['valid'] is False]:
        lines.append(f"| {r['id']} | {r['name'][:40]} | {r['handle']} | {r['note']} |")

    lines.append("\n## Twitter Unknown (check errors)\n")
    lines.append("| id | entity | handle | note |")
    lines.append("|---:|--------|--------|------|")
    for r in [r for r in results_tw if r['valid'] is None]:
        lines.append(f"| {r['id']} | {r['name'][:40]} | {r['handle']} | {r['note'][:60]} |")

    lines.append("\n## Bluesky\n")
    lines.append("| id | entity | handle | valid | note |")
    lines.append("|---:|--------|--------|:-----:|------|")
    for r in results_bs:
        lines.append(f"| {r['id']} | {r['name'][:40]} | {r['handle']} | {r['valid']} | {r['note']} |")

    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print(f"Report written: {REPORT_PATH}")

    # Also write raw JSON for programmatic follow-ups
    raw_path = REPORT_PATH.replace('.md', '.json')
    with open(raw_path, 'w') as f:
        json.dump({'urls': results_urls, 'twitter': results_tw, 'bluesky': results_bs}, f, indent=2)
    print(f"Raw JSON: {raw_path}")


if __name__ == '__main__':
    main()
