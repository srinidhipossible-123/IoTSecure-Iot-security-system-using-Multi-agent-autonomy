from duckduckgo_search import DDGS
from store.memory_store import store

def search_threat_intel(vendor: str) -> str:
    """Search for latest CVE/security news for a vendor."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(
                f"{vendor} IoT device vulnerability CVE 2024 2025",
                max_results=3
            ))
        if results:
            return " | ".join(r.get("body", "")[:150] for r in results)
    except Exception as e:
        store.log(f"[SEARCH][WARN] DuckDuckGo failed: {e}")
    return ""

def search_exploit(cve_id: str) -> str:
    """Search for exploit details for a specific CVE."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(f"{cve_id} exploit PoC", max_results=2))
        if results:
            return " | ".join(r.get("body", "")[:150] for r in results)
    except Exception as e:
        store.log(f"[SEARCH][WARN] Exploit search failed: {e}")
    return ""
