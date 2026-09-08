import React from 'react';
import MessageCard from './MessageCard';

const MessageList = ({
  messages,
  selected,
  onToggleSelect,
  onUpdateStatus,
  onDelete,
  onReply,
}) => {
  // Debug: log incoming messages prop to help trace UI rendering issues
  try {
    // eslint-disable-next-line no-console
    console.log('[MessageList] received messages', { length: messages.length, sample: messages.slice(0,2) });
  } catch (e) {}

  return (
    <div className="messages-list">
      {messages.map((m) => (
        <MessageCard
          key={m._id}
          message={m}
          isSelected={selected.includes(m._id)}
          onToggleSelect={onToggleSelect}
          onUpdateStatus={onUpdateStatus}
          onDelete={onDelete}
          onReply={onReply}
        />
      ))}
    </div>
  );
};

export default MessageList;
