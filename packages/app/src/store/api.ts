import type { DesignFile, FileListItem } from '../types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listFiles(): Promise<FileListItem[]> {
    return request('/files');
  },

  getFile(id: string): Promise<DesignFile> {
    return request(`/files/${id}`);
  },

  createFile(file: DesignFile): Promise<FileListItem> {
    return request('/files', { method: 'POST', body: JSON.stringify({ file }) });
  },

  updateFile(id: string, file: DesignFile): Promise<FileListItem> {
    return request(`/files/${id}`, { method: 'PUT', body: JSON.stringify({ file }) });
  },

  deleteFile(id: string): Promise<void> {
    return request(`/files/${id}`, { method: 'DELETE' });
  },
};
