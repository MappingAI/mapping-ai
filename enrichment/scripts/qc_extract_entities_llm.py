"""Batch 3 QC: LLM-based extraction of org/person/resource mentions from entity notes.

Uses Sonnet 4.6 via raw HTTPS (no SDK dep). Batches 5 notes per call, runs up to
8 concurrent calls. Writes all candidates to tmp/entity_llm_candidates.json and a
deduped, ranked report to logs/audits/entity-extraction-llm-{date}.md.
"""
import os
import json
import ssl
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter, defaultdict
from datetime import datetime

import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT_MD = os.path.join(REPO_ROOT, 'logs', 'audits', f'entity-extraction-llm-{datetime.now().strftime("%Y%m%d")}.md')
OUT_JSON = os.path.join(REPO_ROOT, 'tmp', 'entity_llm_candidates.json')

MODEL = 'claude-sonnet-4-6'
API_KEY = os.environ['ANTHROPIC_API_KEY']
BATCH_SIZE = 5
WORKERS = 8
TIMEOUT = 120

SYS_PROMPT = """You extract entity mentions from short AI-policy stakeholder notes.

For each note, identify proper-noun mentions of:
- organizations (companies, labs, think tanks, nonprofits, gov agencies, funds, publications-as-org)
- people (full names of individuals)
- resources (specific named books, papers, reports, podcasts, newsletters, bills/acts)

Rules:
- Return ONLY specific named entities — skip generic phrases ("AI safety", "the government", "a major lab").
- Preserve canonical form (e.g., "Hugging Face" not "hugging face"; "Meta FAIR" not "meta fair").
- Skip titles/roles without names ("Chief AI Officer", "Senior Fellow").
- Skip common geography ("San Francisco", "New York", "UK") unless part of an org name.
- Skip the subject of the note itself (given as `subject_name`).
- If a mention is ambiguous or unclear, skip it.

Output: strict JSON array, one object per input note, in input order:
[
  {"note_id": 123, "orgs": [...], "people": [...], "resources": [...]},
  ...
]"""


def anthropic_call(messages, max_tokens=2000):
    body = json.dumps({
        'model': MODEL,
        'max_tokens': max_tokens,
        'system': SYS_PROMPT,
        'messages': messages,
    }).encode('utf-8')
    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=body,
        headers={
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        method='POST',
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                data = json.loads(resp.read())
                return data
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8', errors='replace')[:400]
            if e.code in (429, 529, 503, 500) and attempt < 4:
                time.sleep(2 ** attempt * 3)
                continue
            raise RuntimeError(f'HTTP {e.code}: {err_body}')
        except Exception as e:
            if attempt < 4:
                time.sleep(2 ** attempt)
                continue
            raise
    raise RuntimeError('retries exhausted')


def process_batch(batch):
    """batch: list of (note_id, entity_name, entity_type, notes_text)."""
    user_content = 'Extract entities from these notes:\n\n'
    for nid, ename, etype, text in batch:
        trimmed = text[:3000]
        user_content += f'---\nnote_id: {nid}\nsubject_name: {ename}\nsubject_type: {etype}\ntext: {trimmed}\n'
    user_content += '\nReturn the JSON array.'
    resp = anthropic_call([{'role': 'user', 'content': user_content}])
    text_out = resp['content'][0]['text']
    # Strip code fences if present
    s = text_out.strip()
    if s.startswith('```'):
        s = s.split('\n', 1)[1]
        if s.endswith('```'):
            s = s.rsplit('```', 1)[0]
        if s.startswith('json\n'):
            s = s[5:]
    try:
        parsed = json.loads(s)
    except json.JSONDecodeError:
        # Try to find the JSON array in the response
        start = s.find('[')
        end = s.rfind(']')
        if start >= 0 and end > start:
            parsed = json.loads(s[start:end+1])
        else:
            raise RuntimeError(f'unparseable response: {text_out[:400]}')
    return parsed, resp.get('usage', {})


def main():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute("""
      SELECT id, name, entity_type, notes FROM entity
      WHERE notes IS NOT NULL AND LENGTH(notes) >= 80
      ORDER BY id
    """)
    rows = cur.fetchall()
    # Build known-name set for filtering
    cur.execute("SELECT name FROM entity")
    import re
    known = set()
    for (n,) in cur.fetchall():
        known.add(n.lower().strip())
        for m in re.finditer(r'\(([^)]+)\)', n):
            alias = re.sub(r'^(formerly|previously|also known as|aka|né)\s+', '', m.group(1).strip(), flags=re.I)
            for part in re.split(r'\s*(?:&|\band\b|;|,)\s*', alias):
                if part.strip():
                    known.add(part.strip().lower())
        base = re.sub(r'\s*\(.*?\)\s*', '', n).strip().lower()
        if base:
            known.add(base)
    conn.close()
    print(f"notes to process: {len(rows)}; known names (with aliases): {len(known)}")

    batches = [rows[i:i+BATCH_SIZE] for i in range(0, len(rows), BATCH_SIZE)]
    print(f"batches: {len(batches)}")

    all_results = []
    total_in = total_out = 0
    done = 0
    errors = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(process_batch, b): b for b in batches}
        for fut in as_completed(futs):
            batch = futs[fut]
            try:
                parsed, usage = fut.result()
                all_results.extend(parsed)
                total_in += usage.get('input_tokens', 0)
                total_out += usage.get('output_tokens', 0)
            except Exception as e:
                errors.append((batch[0][0], str(e)[:200]))
            done += 1
            if done % 20 == 0 or done == len(batches):
                elapsed = time.time() - t0
                print(f"  {done}/{len(batches)} batches | in={total_in} out={total_out} | errors={len(errors)} | {elapsed:.0f}s")

    print(f"\ntotal: in={total_in} out={total_out} | errors={len(errors)}")
    if errors:
        for eid, msg in errors[:5]:
            print(f"  err note_id={eid}: {msg}")

    # Persist raw
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    json.dump({'results': all_results, 'usage_in': total_in, 'usage_out': total_out,
               'errors': errors}, open(OUT_JSON, 'w'), indent=2)

    # Aggregate
    org_counts = Counter()
    org_refs = defaultdict(set)
    person_counts = Counter()
    person_refs = defaultdict(set)
    resource_counts = Counter()
    resource_refs = defaultdict(set)
    for r in all_results:
        nid = r.get('note_id')
        for o in r.get('orgs') or []:
            key = o.strip()
            if not key or key.lower() in known:
                continue
            org_counts[key] += 1
            org_refs[key].add(nid)
        for p in r.get('people') or []:
            key = p.strip()
            if not key or key.lower() in known:
                continue
            person_counts[key] += 1
            person_refs[key].add(nid)
        for res in r.get('resources') or []:
            key = res.strip()
            if not key or key.lower() in known:
                continue
            resource_counts[key] += 1
            resource_refs[key].add(nid)

    # Write report — top-N per category, requiring >=2 refs for orgs/people, >=1 for resources
    lines = [f"# LLM Entity Extraction (Sonnet 4.5) — {datetime.now().strftime('%Y-%m-%d')}\n"]
    lines.append(f"Model: `{MODEL}` | Notes processed: {len(rows)} | Batches: {len(batches)} | Workers: {WORKERS}")
    lines.append(f"Token usage: input={total_in:,} output={total_out:,} (Sonnet 4.5 pricing: ~${total_in*3/1e6 + total_out*15/1e6:.2f})")
    if errors:
        lines.append(f"Errors: {len(errors)} batches failed.")
    lines.append("\n## Missing Organizations (ranked by mention count, ≥2 refs)\n")
    lines.append("| count | #entities | org |")
    lines.append("|------:|----------:|-----|")
    for k, n in org_counts.most_common():
        if n < 2:
            continue
        lines.append(f"| {n} | {len(org_refs[k])} | {k} |")
    lines.append("\n## Missing Persons (ranked by mention count, ≥2 refs)\n")
    lines.append("| count | #entities | person |")
    lines.append("|------:|----------:|--------|")
    for k, n in person_counts.most_common():
        if n < 2:
            continue
        lines.append(f"| {n} | {len(person_refs[k])} | {k} |")
    lines.append("\n## Missing Resources (ranked by mention count, ≥2 refs)\n")
    lines.append("| count | #entities | resource |")
    lines.append("|------:|----------:|----------|")
    for k, n in resource_counts.most_common():
        if n < 2:
            continue
        lines.append(f"| {n} | {len(resource_refs[k])} | {k} |")
    lines.append(f"\n## Singletons (seen once)\nOrgs: {sum(1 for _,n in org_counts.items() if n==1)}; Persons: {sum(1 for _,n in person_counts.items() if n==1)}; Resources: {sum(1 for _,n in resource_counts.items() if n==1)}. See raw JSON for the full list.\n")

    with open(OUT_MD, 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print(f"Report: {OUT_MD}")
    print(f"Raw:    {OUT_JSON}")


if __name__ == '__main__':
    main()
