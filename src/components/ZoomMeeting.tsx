"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  meetingNumber: string;
  password: string;
  userName: string;
  role: number;
  zak?: string;
  signature?: string;
  sdkKey?: string;
  onLeave: () => void;
};

const SDK_VERSION = "6.1.0";

const SCRIPTS = [
  `https://source.zoom.us/${SDK_VERSION}/lib/vendor/react.min.js`,
  `https://source.zoom.us/${SDK_VERSION}/lib/vendor/react-dom.min.js`,
  `https://source.zoom.us/${SDK_VERSION}/lib/vendor/redux.min.js`,
  `https://source.zoom.us/${SDK_VERSION}/lib/vendor/redux-thunk.min.js`,
  `https://source.zoom.us/${SDK_VERSION}/lib/vendor/lodash.min.js`,
  `https://source.zoom.us/zoom-meeting-embedded-${SDK_VERSION}.min.js`,
];

// Zoom's documented hard limits for the "default" (gallery/speaker) view.
// Anything outside this range gets silently clamped by the SDK internally —
// so we clamp first, ourselves, to keep our layout in sync with what
// Zoom will actually render.
const MAX_SIZE = { width: 1440, height: 720 };
const MIN_SIZE = { width: 720, height: 411 };

function clamp(width: number, height: number) {
  return {
    width: Math.min(Math.max(width, MIN_SIZE.width), MAX_SIZE.width),
    height: Math.min(Math.max(height, MIN_SIZE.height), MAX_SIZE.height),
  };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

async function loadZoomSdk() {
  for (const src of SCRIPTS) {
    await loadScript(src);
  }
}

function getClampedSize(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return clamp(Math.round(rect.width), Math.round(rect.height));
}

export default function ZoomMeeting({
  meetingNumber,
  password,
  userName,
  role,
  zak,
  signature: providedSignature,
  sdkKey: providedSdkKey,
  onLeave,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Preparing meeting...");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let client: any;
    let cancelled = false;
    let joined = false;
    let resizeObserver: ResizeObserver | null = null;

    async function start() {
      try {
        let signature = providedSignature;
        let sdkKey = providedSdkKey;

        if (!signature || !sdkKey) {
          setStatus("Requesting signature...");
          const res = await fetch("/api/signature", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meetingNumber, role }),
          });
          const data = await res.json();
          if (!res.ok)
            throw new Error(data.error || "Signature request failed");
          signature = data.signature;
          sdkKey = data.sdkKey;
        }

        if (cancelled) return;

        setStatus("Loading Zoom SDK...");
        await loadZoomSdk();

        if (cancelled || !(window as any).ZoomMtgEmbedded) return;

        client = (window as any).ZoomMtgEmbedded.createClient();
        if (!containerRef.current || !wrapperRef.current) return;

        setStatus("Initializing SDK...");

        await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Measure the WRAPPER (the space available), then clamp to
        // Zoom's documented max of 1440x720 before passing it in.
        const { width, height } = getClampedSize(wrapperRef.current);

        await client.init({
          zoomAppRoot: containerRef.current,
          language: "en-US",
          patchJsMedia: true,
          customize: {
            video: {
              isResizable: true,
              viewSizes: {
                default: { width, height },
              },
              popper: {
                disableDraggable: true,
              },
            },
          },
        });

        if (cancelled) return;

        setStatus(role === 1 ? "Starting class..." : "Joining class...");
        await client.join({
          sdkKey,
          signature,
          meetingNumber,
          password,
          userName,
          ...(zak ? { zak } : {}),
        });

        joined = true;
        if (!cancelled) setStatus("joined");

        // Correct API for resizing after init/join is `updateVideoOptions`,
        // not `updateVideoSize` (that method doesn't exist on the client).
        resizeObserver = new ResizeObserver(() => {
          if (!wrapperRef.current || cancelled) return;
          const size = getClampedSize(wrapperRef.current);
          client?.updateVideoOptions?.({
            viewSizes: { default: size },
          });
        });
        resizeObserver.observe(wrapperRef.current);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) setError(err?.message ?? "Something went wrong");
      }
    }

    start();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (joined) {
        try {
          client?.leaveMeeting?.();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = (
    <div className="fixed inset-0 w-screen h-screen bg-black flex flex-col overflow-hidden z-[999]">
      <div className="flex items-center justify-between bg-black px-3 py-2 sm:px-4 shrink-0">
        <span className="text-xs sm:text-sm text-gray-200 truncate">
          {error
            ? `Error: ${error}`
            : status !== "joined"
              ? status
              : role === 1
                ? "Class is live"
                : "In class"}
        </span>
        <button
          onClick={onLeave}
          className="text-xs sm:text-sm px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 shrink-0"
        >
          {role === 1 ? "End Class" : "Leave"}
        </button>
      </div>
      {/* Zoom's video canvas has a hard max of 1440x720, so we center it
          in whatever space is left instead of trying to stretch it edge
          to edge — stretching past the max isn't possible. */}
      <div
        ref={wrapperRef}
        className="relative flex-1 max-h-screen w-full flex items-center justify-center overflow-auto"
      >
        <div ref={containerRef} id="meetingSDKElement" />
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
