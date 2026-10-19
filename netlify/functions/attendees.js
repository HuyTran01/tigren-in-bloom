const { createClient } = require('@supabase/supabase-js');
const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const db = () => process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) : null;
const adminOk = (event) => process.env.ADMIN_PASSWORD && event.headers?.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`;
exports.handler = async (event) => {
  const client = db();
  if (!client) return json(503, { error: 'Database is not configured' });
  const params = new URLSearchParams(event.rawQuery || '');
  if (event.httpMethod === 'GET') {
    const page = Math.max(1, Number(params.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(params.get('limit') || 10)));
    const from = (page - 1) * limit;
    const { data, error, count } = await client.from('attendees').select('id,name,created_at', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + limit - 1);
    if (error) return json(500, { error: 'Unable to load attendees' });
    return json(200, { attendees: data || [], total: count || 0, page, limit, totalPages: Math.max(1, Math.ceil((count || 0) / limit)) });
  }
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON' }); }
  if (event.httpMethod === 'POST') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 120) return json(400, { error: 'Invalid name' });
    const normalized_name = name.normalize('NFKC').toLocaleLowerCase('vi-VN');
    const { data, error } = await client.from('attendees').insert({ name, normalized_name }).select('id,name,created_at').single();
    if (error?.code === '23505') return json(409, { error: 'Duplicate name' });
    if (error) return json(500, { error: 'Unable to save attendee' });
    return json(201, { attendee: data });
  }
  if (!adminOk(event)) return json(401, { error: 'Unauthorized' });
  const id = Number(params.get('id'));
  if (!id) return json(400, { error: 'Invalid id' });
  if (event.httpMethod === 'PUT') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 120) return json(400, { error: 'Invalid name' });
    const { data, error } = await client.from('attendees').update({ name, normalized_name: name.normalize('NFKC').toLocaleLowerCase('vi-VN') }).eq('id', id).select('id,name,created_at').single();
    if (error?.code === '23505') return json(409, { error: 'Duplicate name' });
    if (error) return json(404, { error: 'Attendee not found' });
    return json(200, { attendee: data });
  }
  if (event.httpMethod === 'DELETE') {
    const { error } = await client.from('attendees').delete().eq('id', id);
    if (error) return json(500, { error: 'Unable to delete attendee' });
    return json(200, { ok: true });
  }
  return json(405, { error: 'Method Not Allowed' });
};
