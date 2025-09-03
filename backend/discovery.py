import gzip
import datetime as dt
import re
import urllib.parse as up
import xml.etree.ElementTree as ET
from typing import Iterator, List, Optional, Tuple

import requests

UA = {"User-Agent": "URLDiscover/1.0 (+personal use)"}

def _ensure_scheme(url: str) -> str:
    if not re.match(r"^https?://", url):
        return "https://" + url
    return url

def _domain_root(url: str) -> str:
    u = up.urlparse(url)
    return f"{u.scheme}://{u.netloc}"

def _get_text(resp: requests.Response) -> bytes:
    content = resp.content
    if resp.headers.get("Content-Type", "").startswith("application/x-gzip") or resp.url.endswith(".gz"):
        return gzip.decompress(content)
    return content

def _fetch(url: str, timeout=(5, 15)) -> requests.Response:
    resp = requests.get(url, headers=UA, timeout=timeout)
    print(resp)
    print(resp.text)
    resp.raise_for_status()
    return resp

def _discover_sitemaps(base: str) -> List[str]:
    sitemaps = set()
    # robots.txt
    try:
        r = _fetch(up.urljoin(base, "/robots.txt"))
        for line in r.text.splitlines():
            if line.lower().startswith("sitemap:"):
                sm = line.split(":", 1)[1].strip()
                if sm:
                    sitemaps.add(sm)
    except Exception:
        pass

    # common fallbacks
    for cand in ["/sitemap.xml", "/sitemap_index.xml"]:
        try:
            url = up.urljoin(base, cand)
            resp = _fetch(url)
            if resp.ok:
                sitemaps.add(resp.url)  # resolved URL
        except Exception:
            pass

    return list(sitemaps)

# ---- Robust XML helpers ----
def _local(tag: str) -> str:
    return tag.split("}", 1)[1] if tag.startswith("{") else tag

def _parse_lastmod(text: Optional[str]) -> Optional[dt.datetime]:
    if not text:
        return None
    s = text.strip()
    # try fast-path ISO 8601 first
    try:
        return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        pass
    # a few common fallbacks
    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            return dt.datetime.strptime(s, fmt)
        except Exception:
            continue
    return None

def _iter_sitemap_index(root: ET.Element, max_child_sitemaps: int = 50) -> Iterator[str]:
    """Walk a <sitemapindex>, newest child sitemaps first (by <lastmod>)."""
    children: List[Tuple[str, Optional[dt.datetime]]] = []
    # collect (loc, lastmod)
    for sm in root.iter():
        if _local(sm.tag).lower() == "sitemap":
            print(sm)
            loc_val, lastmod_val = None, None
            for el in sm:
                name = _local(el.tag).lower()
                if name == "loc":
                    loc_val = (el.text or "").strip()
                elif name == "lastmod":
                    lastmod_val = _parse_lastmod(el.text)
            if loc_val:
                children.append((loc_val, lastmod_val))

    # newest first; None last
    children.sort(key=lambda t: (t[1] is None, -(t[1].timestamp()) if t[1] else 0))

    for loc, _ in children[:max_child_sitemaps]:
        yield from _iter_sitemap_urls(loc, max_child_sitemaps=max_child_sitemaps)

def _iter_xml_sitemap_urls(root: ET.Element, max_child_sitemaps: int = 50) -> Iterator[str]:
    name = _local(root.tag).lower()

    if name == "sitemapindex":
        yield from _iter_sitemap_index(root, max_child_sitemaps=max_child_sitemaps)
        return

    if name == "urlset":
        # normal URL set
        for el in root.iter():
            if _local(el.tag).lower() == "loc":
                u = (el.text or "").strip()
                if u:
                    yield u
        return

    # last-resort: collect any <loc> we see
    for el in root.iter():
        if _local(el.tag).lower() == "loc":
            u = (el.text or "").strip()
            if u:
                yield u

def _iter_sitemap_urls(sitemap_url: str, *, max_child_sitemaps: int = 50) -> Iterator[str]:
    print(sitemap_url)
    try:
        resp = _fetch(sitemap_url)
        print(resp)
        blob = _get_text(resp)
        print(blob)
    except Exception:
        return

    try:
        root = ET.fromstring(blob)  # bytes OK
    except Exception:
        # (optional) you can add plain-text or RSS/Atom fallbacks here if you like
        return

    yield from _iter_xml_sitemap_urls(root, max_child_sitemaps=max_child_sitemaps)

def discover_via_sitemaps(prefix: str, limit: int = 50, *, max_child_sitemaps: int = 50) -> List[str]:
    prefix = _ensure_scheme(prefix)
    base = _domain_root(prefix)
    print(base)
    sitemaps = _discover_sitemaps(base)
    print(sitemaps)
    seen, out = set(), []

    for sm in sitemaps:
        for url in _iter_sitemap_urls(sm, max_child_sitemaps=max_child_sitemaps):
            if url.startswith(prefix) and url not in seen:
                seen.add(url)
                out.append(url)
                if len(out) >= limit:
                    return out
    return out

# Example:
urls = discover_via_sitemaps("https://www.wikipedia.org/", limit=30, max_child_sitemaps=25)
print("\n".join(urls))