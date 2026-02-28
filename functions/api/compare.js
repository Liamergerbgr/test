const JSON_HEADERS = { 'Content-Type': 'application/json' };

// UUID v4 format validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: JSON_HEADERS });
  }

  const { oldPolicyText, newPolicyText, notes, deviceId } = body;

  if (!oldPolicyText || !newPolicyText) {
    return new Response(JSON.stringify({ error: 'oldPolicyText and newPolicyText are required' }), { status: 400, headers: JSON_HEADERS });
  }

  if (typeof oldPolicyText !== 'string' || typeof newPolicyText !== 'string') {
    return new Response(JSON.stringify({ error: 'Policy text must be a string' }), { status: 400, headers: JSON_HEADERS });
  }

  if (oldPolicyText.length > 500000 || newPolicyText.length > 500000) {
    return new Response(JSON.stringify({ error: 'PDF text too large. Please use smaller documents.' }), { status: 400, headers: JSON_HEADERS });
  }

  const webhookUrl = env.N8N_WEBHOOK_URL;
  const webhookSecret = env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl) {
    return new Response(JSON.stringify({ error: 'Server not configured. Contact support.' }), { status: 500, headers: JSON_HEADERS });
  }

  // Extract IP and auth token to forward to n8n for trial/quota gating
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const authHeader = request.headers.get('Authorization') || '';
  const authToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  // Validate and sanitize optional fields
  const safeDeviceId = (typeof deviceId === 'string' && UUID_RE.test(deviceId)) ? deviceId : '';
  const safeNotes = typeof notes === 'string' ? notes.slice(0, 5000) : '';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (webhookSecret) headers['x-renewalscan-secret'] = webhookSecret;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        oldPolicyText,
        newPolicyText,
        notes: safeNotes,
        _ip: clientIp,
        _deviceId: safeDeviceId,
        _token: authToken
      }),
      signal: AbortSignal.timeout(180000)
    });

    if (!response.ok) {
      let errorBody = {};
      try { errorBody = await response.json(); } catch (_) { /* not JSON */ }

      // Pass 402 (trial/quota exhausted) directly to the frontend
      if (response.status === 402) {
        return new Response(JSON.stringify(errorBody), {
          status: 402,
          headers: JSON_HEADERS
        });
      }

      const errorMessage = errorBody.message || (typeof errorBody.error === 'string' ? errorBody.error : 'Processing error. Please try again.');
      return new Response(JSON.stringify({ error: errorMessage }), { status: 502, headers: JSON_HEADERS });
    }

    const result = await response.json();
    return new Response(JSON.stringify(result), { status: 200, headers: JSON_HEADERS });

  } catch (err) {
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    return new Response(JSON.stringify({
      error: isTimeout
        ? 'Request timed out. The document may be too large. Please try again.'
        : 'Failed to reach processing server.'
    }), { status: 502, headers: JSON_HEADERS });
  }
}
