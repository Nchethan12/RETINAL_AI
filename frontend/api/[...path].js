const BACKEND_URL = "https://retinal-ai-backend.onrender.com";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(request, response) {
  const path = Array.isArray(request.query.path)
    ? request.query.path.join("/")
    : request.query.path || "";
  const query = new URLSearchParams(request.query);
  query.delete("path");
  const target = `${BACKEND_URL}/${path}${query.toString() ? `?${query}` : ""}`;
  const headers = { ...request.headers };
  delete headers.host;

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request,
    duplex: "half",
  });

  response.status(upstream.status);
  upstream.headers.forEach((value, key) => response.setHeader(key, value));
  response.send(Buffer.from(await upstream.arrayBuffer()));
}
