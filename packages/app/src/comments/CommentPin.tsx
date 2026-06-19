import React, { useState } from 'react';
import type { Comment } from '../types';
import { useDesignStore } from '../store/useDesignStore';

interface CommentPinProps {
  comment: Comment;
}

export function CommentPin({ comment }: CommentPinProps) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');
  const { resolveComment, addReply } = useDesignStore();

  return (
    <div
      style={{
        position: 'absolute',
        left: comment.x - 12,
        top: comment.y - 12,
        zIndex: 100,
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: comment.resolved ? '#9CA3AF' : '#F59E0B',
          border: '2px solid white',
          cursor: 'pointer',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
        title={comment.resolved ? 'Resolved' : 'Open comment'}
      >
        {comment.resolved ? '✓' : '💬'}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 0,
            width: 260,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 200,
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Original comment */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                {comment.author}
              </span>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>
                {new Date(comment.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{comment.text}</p>
          </div>

          {/* Replies */}
          {comment.replies.map((reply) => (
            <div
              key={reply.id}
              style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{reply.author}</span>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>
                  {new Date(reply.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>{reply.text}</p>
            </div>
          ))}

          {/* Actions */}
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="text"
              placeholder="Your name"
              value={replyAuthor}
              onChange={(e) => setReplyAuthor(e.target.value)}
              style={{
                fontSize: 11,
                padding: '3px 6px',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                outline: 'none',
              }}
            />
            <textarea
              placeholder="Reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
              style={{
                fontSize: 12,
                padding: '4px 6px',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => {
                  if (replyText.trim() && replyAuthor.trim()) {
                    addReply(comment.id, { text: replyText, author: replyAuthor });
                    setReplyText('');
                  }
                }}
                style={{
                  flex: 1,
                  fontSize: 11,
                  padding: '4px 8px',
                  background: '#0066FF',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Reply
              </button>
              {!comment.resolved && (
                <button
                  onClick={() => {
                    resolveComment(comment.id);
                    setOpen(false);
                  }}
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Resolve
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
