import type { DesignFile } from '../types';

export async function saveDesignFile(file: DesignFile): Promise<void> {
  const json = JSON.stringify(file, null, 2);

  if (!('showSaveFilePicker' in window)) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name}.canvas.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const handle = await (window as Window & typeof globalThis & {
    showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
  }).showSaveFilePicker({
    suggestedName: `${file.name}.canvas.json`,
    types: [
      {
        description: 'Storyboard Design File',
        accept: { 'application/json': ['.canvas.json'] },
      },
    ],
  });

  const writable = await handle.createWritable();
  await writable.write(json);
  await writable.close();
}

export async function openDesignFile(): Promise<DesignFile> {
  if (!('showOpenFilePicker' in window)) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.canvas.json,.json';
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) { reject(new Error('No file selected')); return; }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(reader.result as string) as DesignFile;
            if (parsed.version !== 1) throw new Error('Unsupported file version');
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        };
        reader.readAsText(f);
      };
      input.click();
    });
  }

  const [handle] = await (window as Window & typeof globalThis & {
    showOpenFilePicker: (opts: unknown) => Promise<FileSystemFileHandle[]>;
  }).showOpenFilePicker({
    types: [
      {
        description: 'Storyboard Design File',
        accept: { 'application/json': ['.canvas.json'] },
      },
    ],
  });

  const f = await handle.getFile();
  const text = await f.text();
  const parsed = JSON.parse(text) as DesignFile;
  if (parsed.version !== 1) throw new Error('Unsupported file version');
  return parsed;
}
