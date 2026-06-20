import { createContext, useContext } from 'react';

export const FramePortalContext = createContext<HTMLElement | null>(null);

export function useFramePortal(): HTMLElement | undefined {
  return useContext(FramePortalContext) ?? undefined;
}
