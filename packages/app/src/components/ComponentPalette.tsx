import React, { useMemo, useState } from 'react';
import { useRegistryStore } from '../registry/useRegistryStore';
import { useDesignStore } from '../store/useDesignStore';
import { buildIframeUrl } from '../registry/buildIframeUrl';
import type { StorybookStory } from '../types';

interface GroupedStories {
  [group: string]: {
    [component: string]: StorybookStory[];
  };
}

function groupStories(stories: StorybookStory[]): GroupedStories {
  const result: GroupedStories = {};
  for (const story of stories) {
    const parts = story.title.split('/');
    const group = parts[0];
    const component = parts.slice(1).join('/') || parts[0];
    if (!result[group]) result[group] = {};
    if (!result[group][component]) result[group][component] = [];
    result[group][component].push(story);
  }
  return result;
}

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

interface ThumbnailPopoverProps {
  story: StorybookStory;
}

function ThumbnailPopover({ story }: ThumbnailPopoverProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '100%',
        top: 0,
        marginLeft: 8,
        width: 130,
        height: 70,
        background: '#fff',
        border: '1px solid var(--sb-border)',
        borderRadius: 6,
        overflow: 'hidden',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <iframe
        src={buildIframeUrl(story.id, {})}
        style={{
          width: 260,
          height: 140,
          border: 'none',
          transform: 'scale(0.5)',
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
        title={`${story.title} preview`}
        tabIndex={-1}
      />
    </div>
  );
}

interface StoryItemProps {
  story: StorybookStory;
  onDragStart: (e: React.DragEvent, story: StorybookStory) => void;
}

function StoryItem({ story, onDragStart }: StoryItemProps) {
  const [showThumbnail, setShowThumbnail] = useState(false);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setShowThumbnail(true)}
      onMouseLeave={() => setShowThumbnail(false)}
    >
      <div
        draggable
        onDragStart={(e) => onDragStart(e, story)}
        style={{
          padding: '3px 8px 3px 24px',
          fontSize: 12,
          color: 'var(--sb-text-2)',
          cursor: 'grab',
          borderRadius: 3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="palette-story-item"
      >
        {story.name}
      </div>
      {showThumbnail && <ThumbnailPopover story={story} />}
    </div>
  );
}

interface ComponentPaletteProps {
  onDrop?: (story: StorybookStory, frameId: string, x: number, y: number) => void;
}

export function ComponentPalette({ onDrop: _onDrop }: ComponentPaletteProps) {
  const { stories, status } = useRegistryStore();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const localStories = useMemo(
    () => stories.filter((s) => s.title.startsWith('Local/')),
    [stories]
  );

  const filtered = useMemo(() => {
    const nonLocal = stories.filter((s) => !s.title.startsWith('Local/'));
    if (!search) return nonLocal;
    return nonLocal.filter(
      (s) => fuzzyMatch(s.title, search) || fuzzyMatch(s.name, search)
    );
  }, [stories, search]);

  const filteredLocal = useMemo(() => {
    if (!search) return localStories;
    return localStories.filter(
      (s) => fuzzyMatch(s.title, search) || fuzzyMatch(s.name, search)
    );
  }, [localStories, search]);

  const grouped = useMemo(() => groupStories(filtered), [filtered]);

  const handleDragStart = (e: React.DragEvent, story: StorybookStory) => {
    e.dataTransfer.setData('application/x-storybook-story', JSON.stringify(story));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (status === 'loading') {
    return (
      <div style={{ padding: 16, fontSize: 12, color: 'var(--sb-text-3)' }}>
        Loading components...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ padding: 16, fontSize: 12, color: '#ef4444' }}>
        Storybook not connected
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--sb-border)' }}>
        <input
          type="text"
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '4px 8px',
            fontSize: 12,
            border: '1px solid var(--sb-border)',
            borderRadius: 4,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* ── Local stories ─────────────────────────────────────────── */}
        {filteredLocal.length > 0 && (
          <div>
            <div
              style={{
                padding: '5px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--sb-accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                userSelect: 'none',
              }}
            >
              <span>Local</span>
              <span style={{
                fontSize: 9,
                padding: '1px 4px',
                borderRadius: 3,
                background: 'var(--sb-accent-bg)',
                color: 'var(--sb-accent)',
                fontWeight: 500,
              }}>
                {filteredLocal.length}
              </span>
            </div>
            {filteredLocal.map((story) => (
              <div
                key={story.id}
                draggable
                onDragStart={(e) => handleDragStart(e, story)}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  padding: '3px 8px 3px 16px',
                  fontSize: 12,
                  color: 'var(--sb-text-2)',
                  cursor: 'grab',
                  borderRadius: 3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 9, color: 'var(--sb-accent)', flexShrink: 0 }}>◆</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {story.title.replace(/^Local\//, '')}
                </span>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--sb-border)', margin: '4px 0' }} />
          </div>
        )}

        {/* ── Storybook library ─────────────────────────────────────── */}
        {Object.entries(grouped).map(([group, components]) => {
          const groupKey = `g:${group}`;
          const isGroupCollapsed = collapsed.has(groupKey);
          return (
            <div key={group}>
              <div
                onClick={() => toggleGroup(groupKey)}
                style={{
                  padding: '5px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--sb-text-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  userSelect: 'none',
                  overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: 9, flexShrink: 0 }}>{isGroupCollapsed ? '▶' : '▼'}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group}</span>
              </div>

              {!isGroupCollapsed &&
                Object.entries(components).map(([compName, storyList]) => {
                  const compKey = `c:${group}:${compName}`;
                  const isCompCollapsed = collapsed.has(compKey);
                  return (
                    <div key={compName}>
                      <div
                        onClick={() => toggleGroup(compKey)}
                        style={{
                          padding: '4px 8px 4px 16px',
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'var(--sb-text-2)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          userSelect: 'none',
                          overflow: 'hidden',
                        }}
                      >
                        <span style={{ fontSize: 9, flexShrink: 0 }}>{isCompCollapsed ? '▶' : '▼'}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{compName}</span>
                      </div>

                      {!isCompCollapsed &&
                        storyList.map((story) => (
                          <StoryItem
                            key={story.id}
                            story={story}
                            onDragStart={handleDragStart}
                          />
                        ))}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
