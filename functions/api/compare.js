export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { oldPolicyText, newPolicyText, notes } = body;

  if (!oldPolicyText || !newPolicyText) {
    return new Response(JSON.stringify({ error: 'oldPolicyText and newPolicyText are required' }), { status: 400 });
  }

  if (oldPolicyText.length > 200000 || newPolicyText.length > 200000) {
    return new Response(JSON.stringify({ error: 'PDF text too large. Please use smaller documents.' }), { status: 400 });
  }

  const webhookUrl = env.N8N_WEBHOOK_URL;
  const webhookSecret = env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl) {
    return new Response(JSON.stringify({ error: 'Server not configured. Contact support.' }), { status: 500 });
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (webhookSecret) headers['x-renewalscan-secret'] = webhookSecret;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ oldPolicyText, newPolicyText, notes: notes || '' }),
      signal: AbortSignal.timeout(180000)
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: 'Processing error. Please try again.', detail: errText }), { status: 502 });
    }

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    return new Response(JSON.stringify({
      error: isTimeout
        ? 'Request timed out. The document may be too large. Please try again.'
        : 'Failed to reach processing server: ' + err.message
    }), { status: 502 });
  }
}
