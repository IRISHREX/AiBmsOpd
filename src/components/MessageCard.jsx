import React, { useState } from 'react';
import './MessageCard.css';
import {
  MdDelete,
  MdMarkEmailRead,
  MdMarkEmailUnread,
  MdReply,
} from 'react-icons/md';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import useClickSound from '../hooks/useClickSound';

const MessageCard = ({
  message,
  isSelected,
  onToggleSelect,
  onUpdateStatus,
  onDelete,
  onReply,
}) => {
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const setupClickSound = useClickSound();

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (replyText.trim()) {
      onReply(message, replyText);
      setReplyText('');
      setShowReply(false);
    }
  };

  return (
    <div className={`message-card ${!message.read ? 'unread' : ''}`}>
      {/* Debug: inspect message shape when rendering cards */}
      {typeof window !== 'undefined' && (function(){ try { console.log('[MessageCard] rendering message', { id: message._id, recipient: message.recipient }); } catch(e){} return null })()}
      <div className="message-selection">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(message._id)}
        />
      </div>
      <div className="message-content">
        <div className="message-sender">
          <span>{message.firstName} {message.lastName}</span>
          <span className="message-contact">{message.email} • {message.phone}</span>
        </div>
        <p className={`message-body ${isExpanded ? 'expanded' : ''}`}>
          {(() => {
            const text = message.message || '';
            const isLongMessage = text.length > 100;

            const renderContent = (content) => {
              const elements = [];
              const regex = /((?:https?:\/\/|www\.)[^\s]+)/gi;
              let lastIndex = 0;
              let match;

              const pushText = (s) => {
                if (!s) return;
                const parts = s.split('\n');
                parts.forEach((part, idx) => {
                  elements.push(part);
                  if (idx < parts.length - 1) {
                    elements.push(<br key={`br-${elements.length}`} />);
                  }
                });
              };

              while ((match = regex.exec(content)) !== null) {
                const idx = match.index;
                if (idx > lastIndex) {
                  pushText(content.substring(lastIndex, idx));
                }
                let url = match[0];
                const href = /^https?:\/\//i.test(url) ? url : `http://${url}`;
                elements.push(
                  <a key={`link-${elements.length}`} href={href} target="_blank" rel="noopener noreferrer">
                    {match[0]}
                  </a>
                );
                lastIndex = idx + match[0].length;
              }

              if (lastIndex < content.length) {
                pushText(content.substring(lastIndex));
              }

              // Fallback: if nothing parsed, show the raw text
              if (elements.length === 0) return content;
              return elements.map((el, i) => (typeof el === 'string' ? <span key={`t-${i}`}>{el}</span> : el));
            };

            if (isLongMessage && !isExpanded) {
              return (
                <>
                  {renderContent(text.substring(0, 100))}...
                  <button onClick={() => setIsExpanded(true)} className="btn-link">
                    <FiChevronDown />
                  </button>
                </>
              );
            }

            return (
              <>
                {renderContent(text)}
                {isLongMessage && (
                  <button onClick={() => setIsExpanded(false)} className="btn-link">
                    <FiChevronUp />
                  </button>
                )}
              </>
            );
          })()}
        </p>
        {message.recipient && (
          <p className="message-recipient">
            To: {message.recipient.firstName} {message.recipient.lastName}
          </p>
        )}
        <p className="message-timestamp">
          {new Date(message.createdAt).toLocaleString()}
        </p>
        {showReply && (
          <form onSubmit={handleReplySubmit} className="reply-form">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows="3"
            />
            <div className="reply-actions">
              <button type="submit" className="btn btn-primary">
                Send Reply
              </button>
              <button
                type="button"
                onClick={() => setShowReply(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="message-actions">
        <button
          ref={setupClickSound}
          onClick={() => onUpdateStatus([message._id], !message.read)}
          className="btn-icon icon-btn"
          title={message.read ? 'Mark as Unread' : 'Mark as Read'}
        >
          {message.read ? <MdMarkEmailUnread size="1.2rem" /> : <MdMarkEmailRead size="1.2rem" />}
        </button>
        <button
          ref={setupClickSound}
          onClick={() => onDelete([message._id])}
          className="btn-icon btn-danger icon-btn"
          title="Delete"
        >
          <MdDelete size="1.2rem" />
        </button>
        <button
          ref={setupClickSound}
          onClick={() => setShowReply(!showReply)}
          className="btn-icon icon-btn"
          title="Quick Reply"
        >
          <MdReply size="1.2rem" />
        </button>
      </div>
    </div>
  );
};

export default MessageCard;

