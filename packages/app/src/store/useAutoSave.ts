import { useEffect, useRef } from 'react';
import { useDesignStore } from './useDesignStore';
import { useRegistryStore } from '../registry/useRegistryStore';
import { buildLocalStoryFile } from '../export/jsxExport';
import { api } from './api';

export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Initialized to the current updatedAt so the just-loaded file doesn't
  // trigger an immediate redundant PUT.
  const lastSavedAtRef = useRef<number>(
    useDesignStore.getState().file?.updatedAt ?? 0
  );

  useEffect(() => {
    const unsubscribe = useDesignStore.subscribe((state) => {
      const file = state.file;
      if (!file) return;
      if (file.updatedAt <= lastSavedAtRef.current) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        const current = useDesignStore.getState().file;
        if (!current) return;
        try {
          await api.updateFile(current.id, current);
          lastSavedAtRef.current = current.updatedAt;

          // Also write each frame as a .tsx story file for git-diffable output.
          const stories = useRegistryStore.getState().stories;
          const framePayloads = current.frames.map((frame) => ({
            name: frame.label,
            content: buildLocalStoryFile(frame, frame.label, stories),
          }));
          api.saveFrameStories(framePayloads).catch((err) => {
            console.warn('[auto-save] frame story write failed:', err);
          });
        } catch (err) {
          console.warn('[auto-save] failed:', err);
        }
      }, 1000);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
