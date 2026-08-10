import { useEffect, useRef, useState, useCallback } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function wsUrl() {
  const base = BACKEND_URL.replace(/^http/, "ws");
  return `${base}/api/ws/telemetry`;
}

const MAX_HISTORY = 60;

export function useTelemetry() {
  const [status, setStatus] = useState("connecting"); // connecting | connected | reconnecting | error
  const [frame, setFrame] = useState(null);
  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    // StrictMode-safe: keine zweite Verbindung öffnen, wenn bereits aktiv
    if (wsRef.current && wsRef.current.readyState <= 1) return;
    try {
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setStatus("connected");
      };

      ws.onmessage = (evt) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(evt.data);
          if (msg.event === "telemetry") {
            setFrame(msg.data);
            setHistory((prev) => {
              if (prev.length && prev[prev.length - 1].seq === msg.data.seq) return prev;
              const next = [...prev, msg.data];
              return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
            });
          } else if (msg.event === "connected") {
            setMeta(msg.data);
          }
        } catch (e) {
          /* ignore */
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!mountedRef.current) return;
        setStatus("reconnecting");
        reconnectRef.current = setTimeout(connect, 1500);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setStatus("error");
        try { ws.close(); } catch (e) {}
      };
    } catch (e) {
      setStatus("error");
      reconnectRef.current = setTimeout(connect, 2000);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
      }
    };
  }, [connect]);

  const sendAction = useCallback((action) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(action));
    }
  }, []);

  return { status, frame, history, meta, sendAction };
}
