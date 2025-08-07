import React, { useState, useEffect, useRef } from 'react';
import { ChevronRightIcon } from './icons';

export type MenuItem =
  | { isSeparator: true; label?: never; onClick?: never; subMenu?: never; disabled?: never; icon?: never; }
  | {
      isSeparator?: false;
      label: string;
      onClick?: () => void;
      disabled?: boolean;
      icon?: React.ReactNode;
      subMenu?: MenuItem[];
    };

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

// Internal component to handle individual menu items and their potential submenus
const MenuListItem: React.FC<{ item: MenuItem; onClose: () => void }> = ({ item, onClose }) => {
    const [isSubMenuOpen, setSubMenuOpen] = useState(false);
    let leaveTimeout: number;

    const handleMouseEnter = () => {
        clearTimeout(leaveTimeout);
        setSubMenuOpen(true);
    };

    const handleMouseLeave = () => {
        // A small delay allows moving the cursor to the submenu without it closing
        leaveTimeout = window.setTimeout(() => {
            setSubMenuOpen(false);
        }, 150);
    };

    if (item.isSeparator) {
        return <li className="h-px bg-gray-200 my-1" role="separator" />;
    }

    const hasSubMenu = item.subMenu && item.subMenu.length > 0;

    const handleClick = () => {
        if (!item.disabled && item.onClick) {
            item.onClick();
            onClose();
        }
    };

    return (
        <li
            role="presentation"
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                role="menuitem"
                onClick={handleClick}
                disabled={item.disabled || (hasSubMenu && !item.onClick)}
                className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-800 rounded hover:bg-blue-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-gray-400"
            >
                {item.icon && <span className="w-4 h-4 text-gray-600">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {hasSubMenu && <ChevronRightIcon />}
            </button>
            {isSubMenuOpen && hasSubMenu && (
                <div className="absolute left-full top-[-5px] ml-1 bg-white min-w-[200px] rounded-md shadow-lg border border-gray-200 p-1">
                    <ul role="menu">
                        {item.subMenu?.map((subItem, index) => (
                            <MenuListItem key={subItem.label || `sub-sep-${index}`} item={subItem} onClose={onClose} />
                        ))}
                    </ul>
                </div>
            )}
        </li>
    );
};

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const style: React.CSSProperties = { top: y, left: x };
  if (menuRef.current) {
      const { innerWidth, innerHeight } = window;
      const { offsetWidth, offsetHeight } = menuRef.current;
      if (x + offsetWidth + 200 > innerWidth) { // Check with submenu width too
          style.left = x - offsetWidth;
      }
      if (y + offsetHeight > innerHeight) {
          style.top = y - offsetHeight;
      }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white min-w-[200px] rounded-md shadow-lg border border-gray-200 p-1"
      style={style}
    >
      <ul role="menu">
        {items.map((item, index) => (
            <MenuListItem key={item.label || `sep-${index}`} item={item} onClose={onClose} />
        ))}
      </ul>
    </div>
  );
};

export default ContextMenu;