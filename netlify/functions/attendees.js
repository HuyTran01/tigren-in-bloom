let attendees = [];

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') return response(200, { attendees });
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return response(400, { error: 'Invalid JSON' }); }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) return response(400, { error: 'Name must be between 1 and 120 characters' });
  if (attendees.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    return response(409, { error: 'This name is already registered' });
  }
  const attendee = { name, created_at: new Date().toISOString() };
  attendees = [...attendees, attendee];
  return response(201, { attendee });
};
