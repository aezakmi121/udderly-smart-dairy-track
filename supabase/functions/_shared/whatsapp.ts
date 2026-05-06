// WhatsApp Cloud API send. No-op (logs only) if secrets missing.
export async function sendWhatsAppTemplate(opts: {
  to: string;
  templateName: string;
  params: string[];
  languageCode?: string;
}): Promise<{ ok: boolean; status?: number; error?: string; raw?: any }> {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneId) {
    return { ok: false, error: 'whatsapp_not_configured' };
  }
  const phone = opts.to.replace(/\D/g, '');
  // Assume India if 10 digits
  const intl = phone.length === 10 ? `91${phone}` : phone;
  const body = {
    messaging_product: 'whatsapp',
    to: intl,
    type: 'template',
    template: {
      name: opts.templateName,
      language: { code: opts.languageCode ?? 'hi' },
      components: opts.params.length
        ? [{ type: 'body', parameters: opts.params.map((t) => ({ type: 'text', text: t })) }]
        : [],
    },
  };
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, raw: data, error: res.ok ? undefined : JSON.stringify(data) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
