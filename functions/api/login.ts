import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { errorResponse, successResponse } from '../utils';

export async function onRequestPost(context: any) {
  try {
    const { username, password } = await context.request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = context.env.DB;
    if (!db) throw new Error('D1 database not bound');

    // Auto-create admin user if no users exist
    const adminPassword = context.env.ADMIN_PASSWORD || 'admin123';
    const { count } = await db.prepare('SELECT COUNT(*) as count FROM users').first() as { count: number };
    
    if (count === 0) {
      const hash = bcrypt.hashSync(adminPassword, 10);
      await db.prepare('INSERT INTO users (username, password) VALUES (?, ?)')
        .bind('admin', hash)
        .run();
    }

    const user = await db.prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first();

    if (!user || !bcrypt.compareSync(password, (user as any).password)) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const JWT_SECRET = new TextEncoder().encode(context.env.JWT_SECRET);
    const token = await new jose.SignJWT({ id: (user as any).id, username: (user as any).username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    return new Response(JSON.stringify({ token }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
