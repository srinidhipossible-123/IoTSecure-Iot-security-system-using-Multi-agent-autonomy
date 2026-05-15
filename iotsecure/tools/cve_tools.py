# tools/cve_tools.py
"""NVD CVE API tool for vulnerability lookups."""
import requests
from store.memory_store import store


def fetch_cves(keyword: str, max_results: int = 10) -> list:
    """Query NVD CVE API for vulnerabilities matching a keyword."""
    if not keyword or keyword == "Unknown":
        return []
    try:
        url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        params = {"keywordSearch": keyword, "resultsPerPage": max_results}
        r = requests.get(url, params=params, timeout=8)
        if r.status_code == 200:
            data = r.json()
            vulns = data.get("vulnerabilities", [])
            return [{
                "id": v["cve"]["id"],
                "description": v["cve"].get("descriptions", [{}])[0].get("value", "")[:200],
                "published": v["cve"].get("published", ""),
            } for v in vulns]
    except Exception as e:
        store.log(f"[CVE][WARN] Lookup failed for {keyword}: {e}")
    return []


def get_cve_details(cve_id: str) -> dict:
    """Get details for a specific CVE ID."""
    try:
        url = f"https://services.nvd.nist.gov/rest/json/cves/2.0"
        params = {"cveId": cve_id}
        r = requests.get(url, params=params, timeout=8)
        if r.status_code == 200:
            data = r.json()
            vulns = data.get("vulnerabilities", [])
            if vulns:
                cve = vulns[0]["cve"]
                return {
                    "id": cve["id"],
                    "description": cve.get("descriptions", [{}])[0].get("value", ""),
                    "published": cve.get("published", ""),
                    "severity": cve.get("metrics", {}).get("cvssMetricV31", [{}])[0].get("cvssData", {}).get("baseSeverity", "UNKNOWN") if cve.get("metrics", {}).get("cvssMetricV31") else "UNKNOWN",
                }
    except Exception as e:
        store.log(f"[CVE][ERROR] Details lookup failed: {e}")
    return {}
