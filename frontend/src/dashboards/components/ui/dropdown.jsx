import React, { useState, useRef, useEffect } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button.jsx';

const SelectDropdown = ({
  options = [],
  selectedValue,
  onSelect,
  label = 'Select',
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  itemClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={`justify-between w-full text-left ${buttonClassName}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate flex-1">{selectedValue || label}</span>
        <CaretDown className="w-4 h-4 ml-2 flex-shrink-0" />
      </Button>

      {open && (
        <div
          className={`absolute right-0 mt-2 min-w-full rounded-lg border border-gray-200 bg-white shadow-lg z-20 max-h-60 overflow-y-auto ${dropdownClassName}`}
          role="listbox"
        >
          <ul className="py-1">
            {options.map((option) => (
              <li key={option.value} className="w-full">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors rounded-md ${itemClassName}`}
                  role="option"
                  aria-selected={selectedValue === option.value}
                >
                  {option.label || option.value}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SelectDropdown;