import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function proxy(request) {
  let backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

  // Normalize backend URL if protocol is omitted
  if (!backendUrl.startsWith("http://") && !backendUrl.startsWith("https://")) {
    if (!backendUrl.includes(".")) {
      backendUrl = `https://${backendUrl}.onrender.com`;
    } else {
      backendUrl = `https://${backendUrl}`;
    }
  }
  backendUrl = backendUrl.replace(/\/$/, "");

  const url = new URL(request.url);
  const targetUrl = `${backendUrl}${url.pathname}${url.search}`;

  const forwardHeaders = new Headers();
  request.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey !== "host" &&
      lowerKey !== "connection" &&
      lowerKey !== "content-length" &&
      lowerKey !== "transfer-encoding"
    ) {
      forwardHeaders.set(key, value);
    }
  });

  const fetchOptions = {
    method: request.method,
    headers: forwardHeaders,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > 0) {
      fetchOptions.body = buffer;
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);

    const resHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "content-encoding" &&
        lowerKey !== "content-length" &&
        lowerKey !== "transfer-encoding"
      ) {
        resHeaders.set(key, value);
      }
    });

    const data = await response.arrayBuffer();
    return new Response(data, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (error) {
    console.error("API Proxy Error:", error);
    return NextResponse.json(
      { detail: `Proxy Error: Unable to reach backend at ${backendUrl}` },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;

