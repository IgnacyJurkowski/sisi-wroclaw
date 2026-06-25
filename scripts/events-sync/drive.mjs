// Minimal Google Drive read client for the events sync. Auth via
// google-auth-library (service account); the Drive calls are plain REST over
// the global fetch, so the dependency surface stays tiny.
//
// Credentials resolution (CI vs local):
//   - GOOGLE_SERVICE_ACCOUNT_JSON = the service-account JSON *content* (CI secret)
//   - else GOOGLE_APPLICATION_CREDENTIALS = a path to the JSON (local dev / ADC)
// The key is read-only Drive; it is never written to the repo.

import { GoogleAuth } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const API = 'https://www.googleapis.com/drive/v3';

export async function getAccessToken() {
  const opts = { scopes: SCOPES };
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline && inline.trim().startsWith('{')) opts.credentials = JSON.parse(inline);
  const auth = new GoogleAuth(opts); // falls back to GOOGLE_APPLICATION_CREDENTIALS
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Drive auth returned no access token');
  return token;
}

async function driveGet(token, path) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Drive GET ${path.split('?')[0]} -> ${res.status} ${await res.text()}`);
  }
  return res;
}

/** Non-trashed children of a folder. Shared-drive flags included so a Shared
    Drive works as well as a normal "anyone with link" folder. */
export async function listFolder(token, folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await driveGet(
    token,
    `/files?q=${q}&fields=files(id,name,mimeType,modifiedTime)&pageSize=1000` +
      `&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=name`,
  );
  return (await res.json()).files || [];
}

/** Export a Google Doc as plain text. */
export async function exportDocText(token, fileId) {
  const res = await driveGet(token, `/files/${fileId}/export?mimeType=text/plain`);
  // Docs export is UTF-8; strip a BOM if present.
  return (await res.text()).replace(/^﻿/, '');
}

/** Download a binary file (e.g. a banner). Returns a Buffer. */
export async function downloadFile(token, fileId) {
  const res = await driveGet(token, `/files/${fileId}?alt=media&supportsAllDrives=true`);
  return Buffer.from(await res.arrayBuffer());
}
