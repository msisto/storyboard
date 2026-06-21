import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRegistryStore } from '../registry/useRegistryStore';
import { getStoryEntry } from '../registry/storyRegistry';
import type { StorybookStory } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComponentEntry {
  groupName: string;
  componentName: string;
  stories: StorybookStory[];
  defaultStory: StorybookStory;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildComponentEntries(stories: StorybookStory[]): ComponentEntry[] {
  const map = new Map<string, ComponentEntry>();
  for (const story of stories) {
    const parts = story.title.split('/');
    const group = parts[0];
    const component = parts.slice(1).join('/') || parts[0];
    const key = `${group}/${component}`;
    if (!map.has(key)) {
      map.set(key, { groupName: group, componentName: component, stories: [], defaultStory: story });
    }
    const entry = map.get(key)!;
    entry.stories.push(story);
    if (story.name.toLowerCase() === 'default') entry.defaultStory = story;
  }
  return [...map.values()].sort((a, b) => a.componentName.localeCompare(b.componentName));
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

// ── useLazyVisible ────────────────────────────────────────────────────────────

function useLazyVisible() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { rootMargin: '80px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── VariantThumbnail ──────────────────────────────────────────────────────────

function VariantThumbnail({
  story,
  onDragStart,
}: {
  story: StorybookStory;
  onDragStart: (e: React.DragEvent, story: StorybookStory) => void;
}) {
  const { ref, visible } = useLazyVisible();
  const entry = getStoryEntry(story.id);

  return (
    <div
      ref={ref}
      draggable
      onDragStart={(e) => onDragStart(e, story)}
      onMouseDown={(e) => e.stopPropagation()}
      className="palette-story-item"
      style={{ cursor: 'grab', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--sb-border)' }}
    >
      <div style={{ width: '100%', height: 72, overflow: 'hidden', position: 'relative', background: 'var(--sb-bg-secondary)' }}>
        {visible && entry ? (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
            <div
              style={{
                flexShrink: 0,
                transform: 'scale(0.5)',
                transformOrigin: 'top center',
                pointerEvents: 'none',
              }}
            >
              {entry.render(entry.defaultArgs)}
            </div>
          </div>
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 20, height: 20, borderRadius: 3, background: 'var(--sb-border)' }} />
          </div>
        )}
      </div>
      <div style={{
        fontSize: 10, color: 'var(--sb-text-2)', textAlign: 'center',
        padding: '3px 4px 4px', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
        background: 'var(--sb-bg-secondary)',
        borderTop: '1px solid var(--sb-border)',
      }}>
        {story.name}
      </div>
    </div>
  );
}

// ── ComponentRow ──────────────────────────────────────────────────────────────

function ComponentRow({
  entry,
  expanded,
  onToggle,
  onDragStart,
}: {
  entry: ComponentEntry;
  expanded: boolean;
  onToggle: () => void;
  onDragStart: (e: React.DragEvent, story: StorybookStory) => void;
}) {
  return (
    <div>
      <div
        onClick={onToggle}
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(e, entry.defaultStory); }}
        onMouseDown={(e) => e.stopPropagation()}
        className="palette-story-item"
        style={{
          padding: '7px 8px 7px 16px', fontSize: 12, fontWeight: 500,
          color: 'var(--sb-text-2)', cursor: 'grab',
          display: 'flex', alignItems: 'center', gap: 6,
          userSelect: 'none', overflow: 'hidden',
        }}
      >
        <span style={{
          fontSize: 8, color: 'var(--sb-text-4)', flexShrink: 0,
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 120ms ease',
          display: 'inline-block',
        }}>▶</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {entry.componentName}
        </span>
        {entry.stories.length > 1 && (
          <span style={{
            fontSize: 9, color: 'var(--sb-text-3)', flexShrink: 0,
            background: 'var(--sb-border)', borderRadius: 3, padding: '1px 3px',
          }}>
            {entry.stories.length}
          </span>
        )}
      </div>
      {expanded && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 6, padding: '4px 8px 8px 8px',
        }}>
          {entry.stories.map((story) => (
            <VariantThumbnail key={story.id} story={story} onDragStart={onDragStart} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── LocalStoryRow ─────────────────────────────────────────────────────────────

function LocalStoryRow({
  story,
  expanded,
  onToggle,
  onDragStart,
}: {
  story: StorybookStory;
  expanded: boolean;
  onToggle: () => void;
  onDragStart: (e: React.DragEvent, story: StorybookStory) => void;
}) {
  const displayName = story.title.replace(/^Local\//, '');

  return (
    <div>
      <div
        onClick={onToggle}
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(e, story); }}
        onMouseDown={(e) => e.stopPropagation()}
        className="palette-story-item"
        style={{
          padding: '7px 8px 7px 16px', fontSize: 12,
          color: 'var(--sb-text-2)', cursor: 'grab', borderRadius: 3,
          display: 'flex', alignItems: 'center', gap: 5,
          userSelect: 'none', overflow: 'hidden',
        }}
      >
        <span style={{ fontSize: 9, color: 'var(--sb-accent)', flexShrink: 0 }}>◆</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {displayName}
        </span>
        <span style={{
          fontSize: 8, color: 'var(--sb-text-4)', flexShrink: 0,
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 120ms ease',
          display: 'inline-block',
        }}>▶</span>
      </div>
      {expanded && (
        <div style={{ padding: '4px 8px 8px 8px' }}>
          <VariantThumbnail story={story} onDragStart={onDragStart} />
        </div>
      )}
    </div>
  );
}

// ── ComponentPalette ──────────────────────────────────────────────────────────

interface ComponentPaletteProps {
  onDrop?: (story: StorybookStory, frameId: string, x: number, y: number) => void;
}

export function ComponentPalette({ onDrop: _onDrop }: ComponentPaletteProps) {
  const { stories } = useRegistryStore();
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());

  const handleDragStart = useCallback((e: React.DragEvent, story: StorybookStory) => {
    e.dataTransfer.setData('application/x-storybook-story', JSON.stringify(story));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleComponent = useCallback((key: string) => {
    setExpandedComponents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const localStories = useMemo(() => stories.filter((s) => s.title.startsWith('Local/')), [stories]);
  const nonLocal = useMemo(() => stories.filter((s) => !s.title.startsWith('Local/')), [stories]);

  const filteredLocal = useMemo(() => {
    if (!search) return localStories;
    return localStories.filter((s) => fuzzyMatch(s.title, search) || fuzzyMatch(s.name, search));
  }, [localStories, search]);

  const componentEntries = useMemo(() => buildComponentEntries(nonLocal), [nonLocal]);

  const filteredEntries = useMemo(() => {
    if (!search) return componentEntries;
    return componentEntries.filter(
      (e) => fuzzyMatch(e.componentName, search) || e.stories.some((s) => fuzzyMatch(s.name, search))
    );
  }, [componentEntries, search]);

  const groupedEntries = useMemo(() => {
    const map = new Map<string, ComponentEntry[]>();
    for (const entry of filteredEntries) {
      const arr = map.get(entry.groupName) ?? [];
      arr.push(entry);
      map.set(entry.groupName, arr);
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [filteredEntries]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--sb-border)' }}>
        <input
          type="text"
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '4px 8px', fontSize: 12,
            border: '1px solid var(--sb-border)', borderRadius: 4,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* ── Storybook library ──────────────────────────────────────── */}
        {[...groupedEntries.entries()].map(([group, entries]) => {
          const groupKey = `g:${group}`;
          const isCollapsed = collapsedGroups.has(groupKey);
          return (
            <div key={group}>
              <div
                onClick={() => toggleGroup(groupKey)}
                style={{
                  padding: '5px 8px', fontSize: 11, fontWeight: 600,
                  color: 'var(--sb-text-3)', textTransform: 'uppercase',
                  letterSpacing: '0.05em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  userSelect: 'none', overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: 9, flexShrink: 0 }}>{isCollapsed ? '▶' : '▼'}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group}</span>
              </div>
              {!isCollapsed && entries.map((entry) => {
                const key = `${entry.groupName}/${entry.componentName}`;
                return (
                  <ComponentRow
                    key={key}
                    entry={entry}
                    expanded={expandedComponents.has(key)}
                    onToggle={() => toggleComponent(key)}
                    onDragStart={handleDragStart}
                  />
                );
              })}
            </div>
          );
        })}

        {/* ── Local stories ──────────────────────────────────────────── */}
        {filteredLocal.length > 0 && (
          <div>
            <div style={{ height: 1, background: 'var(--sb-border)', margin: '4px 0' }} />
            <div style={{
              padding: '5px 8px', fontSize: 11, fontWeight: 600,
              color: 'var(--sb-accent)', textTransform: 'uppercase',
              letterSpacing: '0.05em', display: 'flex', alignItems: 'center',
              gap: 5, userSelect: 'none',
            }}>
              <span>Local</span>
              <span style={{
                fontSize: 9, padding: '1px 4px', borderRadius: 3,
                background: 'var(--sb-accent-bg)', color: 'var(--sb-accent)', fontWeight: 500,
              }}>
                {filteredLocal.length}
              </span>
            </div>
            {filteredLocal.map((story) => {
              const key = `local/${story.id}`;
              return (
                <LocalStoryRow
                  key={story.id}
                  story={story}
                  expanded={expandedComponents.has(key)}
                  onToggle={() => toggleComponent(key)}
                  onDragStart={handleDragStart}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
