import { useEffect } from "react";

// This page is intentionally left blank.
// All raw script serving goes through the serveRaw backend function,
// which enforces the ?key=vander2026 gate + browser/tool blocking.
// If someone navigates here directly, redirect them to the block endpoint.
export default function Raw() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t");
    const id = params.get("id");
    const key = params.get("key");

    // Redirect to the actual protected backend endpoint
    if (t || id) {
      const url = `${window.location.origin}/api/functions/serveRaw?t=${t || ""}&id=${id || ""}&key=${key || ""}`;
      window.location.replace(url);
    } else {
      // No params — show nothing useful
      document.title = "404";
      document.body.innerHTML = "";
    }
  }, []);

  return null;
}