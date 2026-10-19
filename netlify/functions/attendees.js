let attendees = [];
let nextId = 1;

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const adminOk = (event) => {
  const password = process.env.ADMIN_PASSWORD;
  return password && event.headers?.authorization === `Bearer ${password}`;
};

exports.handler = async (event) => {
  const params = new URLSearchParams(event.rawQuery || '');
  if (event.httpMethod === 'GET') {
    const page = Math.max(1, Number(params.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(params.get('limit') || 10)));
    const start = (page - 1) * limit;
    return json(200, { attendees: attendees.slice().reverse().slice(start, start + limit), total: attendees.length, page, limit, totalPages: Math.max(1, Math.ceil(attendees.length / limit)) });
  }
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON' }); }
  if (event.httpMethod === 'POST') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 120) return json(400, { error: 'Invalid name' });
    if (attendees.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return json(409, { error: 'Duplicate name' });
    const attendee = { id: nextId++, name, created_at: new Date().toISOString() };
    attendees.push(attendee); return json(201, { attendee });
  }
  if (!adminOk(event)) return json(401, { error: 'Unauthorized' });
  const id = Number(params.get('id'));
  const index = attendees.findIndex((item) => item.id === id);
  if (index < 0) return json(404, { error: 'Attendee not found' });
  if (event.httpMethod === 'PUT') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 120) return json(400, { error: 'Invalid name' });
    attendees[index] = { ...attendees[index], name }; return json(200, { attendee: attendees[index] });
  }
  if (event.httpMethod === 'DELETE') { attendees.splice(index, 1); return json(200, { ok: true }); }
  return json(405, { error: 'Method Not Allowed' });
};
