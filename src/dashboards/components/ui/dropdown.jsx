import React from 'react';
import { CaretDown } from '@phosphor-icons/react';

const SelectDropdown = ({
  options = [],
  selectedValue,
  onSelect,
  label = 'Select',
  className = '',
  buttonClassName = 'btn btn-sm justify-start truncate',
  dropdownClassName = 'bg-base-100 rounded-box z-[1] p-2 shadow overflow-y-auto max-h-60', // Added max-h-60 for max height
  itemClassName = 'hover:bg-primary/10 hover:text-primary transition-colors duration-200 rounded-md text-sm whitespace-nowrap',
}) => {
  return (
    <div className={`dropdown dropdown-end dropdown-hover ${className}`}>
      {/* Dropdown Trigger Button */}
      <div 
        tabIndex={0} 
        role="button" 
        className={`${buttonClassName} flex items-center justify-between w-full`}
      >
        <span className="truncate">
          {selectedValue || label}
        </span>
        <CaretDown className="w-4 h-4 ml-2" />
      </div>

      {/* Dropdown Menu Content */}
      <div className={`dropdown-content ${dropdownClassName}`}>
        <ul className="menu">
          {options.map((option) => (
            <li key={option.value} className="w-full">
              <a
                onClick={() => onSelect(option.value)}
                className={itemClassName}
              >
                {option.label || option.value}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SelectDropdown;