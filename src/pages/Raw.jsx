import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function Raw() {
  const [content, setContent] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("t");
  const id = params.get("id");

  useEffect(() => {
    if (!token && !id) { setNotFound(true); return; }

    // Key gate — must match the shared secret
    const key = params.get("key");
    if (key !== "vander2026") { setNotFound(true); return; }

    const query = id ? { id } : { loadstring_token: token };
    base44.entities.Script.filter(query).then(r => {
      if (r[0] && r[0].is_active !== false) {
        setContent(r[0].content || "");
      } else {
        setNotFound(true);
      }
    }).catch(() => setNotFound(true));
  }, []);

  if (notFound) {
    return <pre style={{ margin: 0, padding: 0, fontFamily: "monospace", background: "white", color: "black" }}>-- Script not found</pre>;
  }

  if (content === null) {
    return <pre style={{ margin: 0, padding: 0, fontFamily: "monospace", background: "white", color: "black" }}>-- Loading...</pre>;
  }

  return (
    <pre style={{ margin: 0, padding: 0, fontFamily: "monospace", background: "white", color: "black", whiteSpace: "pre-wrap" }}>
      {content}
    </pre>
  );
}