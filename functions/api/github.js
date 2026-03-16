// Cloudflare Pages Function — GitHub API proxy
// Keeps the token server-side, never exposed to the browser

export async function onRequest(context) {
  const { request, env } = context;
  const token = env.GH_TOKEN;

  if (!token) {
    return new Response(JSON.stringify({ error: 'GH_TOKEN not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Parse the target GitHub URL from query param
  const url = new URL(request.url);
  const ghPath = url.searchParams.get('path'); // e.g. "contents/data.json"
  if (!ghPath) {
    return new Response(JSON.stringify({ error: 'Missing path param' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const ghUrl = `https://api.github.com/repos/preritjaiswal-elecnor/elecnortnt/${ghPath}`;

  // Forward the request to GitHub with the token
  const ghReq = new Request(ghUrl, {
    method: request.method,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'TT-Dashboard'
    },
    body: request.method !== 'GET' ? request.body : undefined
  });

  const ghRes = await fetch(ghReq);
  const data = await ghRes.text();

  return new Response(data, {
    status: ghRes.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
