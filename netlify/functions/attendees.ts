import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const getClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
};

export const handler: Handler = async (event) => {
  const client = getClient();

  if (event.httpMethod === 'GET') {
    if (!client) return json(200, { attendees: [] });
    const { data, error } = await client
      .from('attendees')
      .select('id, name, created_at')
      .order('created_at', { ascending: false });
    if (error) return json(500, { error: 'Unable to load attendees' });
    return json(200, { attendees: data ?? [] });
  }

  if (event.httpMethod === 'POST') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(event.body ?? '{}');
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }
    const name = typeof parsed === 'object' && parsed !== null && 'name' in parsed
      ? String((parsed as { name?: unknown }).name).trim()
      : '';
    if (!name || name.length > 120) return json(400, { error: 'Name must be between 1 and 120 characters' });
    if (!client) return json(201, { attendee: { name } });
    const normalizedName = name.normalize('NFKC').toLocaleLowerCase('vi-VN');
    const { data, error } = await client
      .from('attendees')
      .insert({ name, normalized_name: normalizedName })
      .select('id, name, created_at')
      .single();
    if (error?.code === '23505') return json(409, { error: 'This name is already registered' });
    if (error) return json(500, { error: 'Unable to save attendee' });
    return json(201, { attendee: data });
  }

  return json(405, { error: 'Method Not Allowed' });
};
