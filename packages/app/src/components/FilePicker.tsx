import React, { useEffect, useState } from 'react';
import { api } from '../store/api';
import { useDesignStore } from '../store/useDesignStore';
import type { FileListItem } from '../types';

interface FilePickerProps {
  onFileOpened: (id: string) => void;
}

export function FilePicker({ onFileOpened }: FilePickerProps) {
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { newFile } = useDesignStore();

  useEffect(() => {
    api
      .listFiles()
      .then(setFiles)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      newFile('Untitled');
      const file = useDesignStore.getState().file!;
      await api.createFile(file);
      onFileOpened(file.id);
    } catch (e: unknown) {
      setError(String(e));
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this file permanently?')) return;
    await api.deleteFile(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  if (loading) {
    return (
      <div style={centeredStyle}>
        <p style={{ color: 'var(--sb-text-3)', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={centeredStyle}>
      <div style={{ width: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Storyboard
          </h1>
          <button onClick={handleCreate} disabled={creating} style={primaryBtn}>
            {creating ? 'Creating…' : '+ New File'}
          </button>
        </div>

        {error && (
          <p style={{ color: 'var(--sb-error)', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'var(--sb-error-bg)', borderRadius: 6 }}>
            {error}
          </p>
        )}

        {files.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--sb-text-4)', fontSize: 14 }}>
            <p style={{ margin: 0 }}>No files yet.</p>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>Click "New File" to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {files.map((f) => (
              <div
                key={f.id}
                onClick={() => onFileOpened(f.id)}
                style={fileRow}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--sb-text-4)', marginTop: 3 }}>
                    Last modified {new Date(f.updatedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(f.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sb-border-strong)', fontSize: 16, padding: '4px 6px', borderRadius: 4, lineHeight: 1 }}
                  title="Delete file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const centeredStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--sb-bg-secondary)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const primaryBtn: React.CSSProperties = {
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: 500,
  background: 'var(--sb-accent)',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const fileRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  background: 'var(--sb-bg)',
  borderRadius: 8,
  border: '1px solid var(--sb-border)',
  cursor: 'pointer',
  transition: 'border-color 0.1s',
};
