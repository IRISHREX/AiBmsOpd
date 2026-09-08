import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BsThreeDotsVertical } from 'react-icons/bs';
import './RadialMenu.css';

const RadialMenu = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const longPressTimeout = useRef(null);
  const buttonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [angle, setAngle] = useState(45);

  useEffect(() => {
    const handleResize = () => {
      const numChildren = React.Children.count(children);
      if (window.innerWidth <= 480) {
        setAngle(360 / numChildren);
      } else if (window.innerWidth <= 768) {
        setAngle(360 / numChildren);
      } else {
        setAngle(360 / numChildren);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [children]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleParentClick = (e) => {
    if (isOpen) {
      e.stopPropagation();
      setIsOpen(false);
    }
  };
  
  useEffect(() => {
    window.addEventListener('click', handleParentClick);
    return () => {
      window.removeEventListener('click', handleParentClick);
    };
  }, [isOpen]);

  const handleMouseDown = () => {
    longPressTimeout.current = setTimeout(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
        });
      }
      setIsOpen(true);
    }, 500); // 500ms for long press
  };

  const handleMouseUp = () => {
    clearTimeout(longPressTimeout.current);
  };

  const handleTouchStart = () => {
    longPressTimeout.current = setTimeout(() => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setMenuPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
          });
        }
        setIsOpen(true);
      }, 500); // 500ms for long press
  }

  const handleTouchEnd = () => {
    clearTimeout(longPressTimeout.current);
  }

  const menu = (
    <div
      className={`radial-menu ${isOpen ? 'open' : ''}`}
      style={{
        position: 'absolute',
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
      }}
    >
      <div className="radial-menu-items">
        {React.Children.map(children, (child, index) => (
          <div
            className="radial-menu-item"
            style={{
              '--angle': `${(index * angle) - 90}deg`,
            }}
          >
            {React.cloneElement(child, {
              onClick: (e) => {
                if (child.props.onClick) {
                  child.props.onClick(e);
                }
                setIsOpen(false);
              },
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="radial-menu-container">
      <button
        ref={buttonRef}
        className="radial-menu-button"
        onClick={handleToggle}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <BsThreeDotsVertical />
      </button>
      {isOpen && ReactDOM.createPortal(menu, document.body)}
    </div>
  );
};

export default RadialMenu;
