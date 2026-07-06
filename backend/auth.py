import os
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request, Depends
from typing import Optional

EMERGENT_AUTH_URL = 'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data'


async def exchange_session_id(session_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(EMERGENT_AUTH_URL, headers={'X-Session-ID': session_id})
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail='Failed to exchange session id')
        return resp.json()


def ensure_aware(dt) -> datetime:
    if dt is None:
        return None
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


async def get_session_from_request(request: Request, db) -> Optional[dict]:
    token = request.cookies.get('session_token')
    if not token:
        auth = request.headers.get('Authorization') or request.headers.get('authorization')
        if auth and auth.lower().startswith('bearer '):
            token = auth.split(' ', 1)[1].strip()
    if not token:
        return None
    sess = await db.admin_sessions.find_one({'session_token': token}, {'_id': 0})
    if not sess:
        return None
    exp = ensure_aware(sess.get('expires_at'))
    if exp and exp < datetime.now(timezone.utc):
        return None
    return sess


async def get_current_admin(request: Request):
    from server import db  # avoid circular import
    sess = await get_session_from_request(request, db)
    if not sess:
        raise HTTPException(status_code=401, detail='Not authenticated')
    user = await db.admin_users.find_one({'user_id': sess['user_id']}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user
