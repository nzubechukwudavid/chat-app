import React, { useState } from 'react';

import { EyeIcon, EyeOffIcon } from './icons';

/**
 * Password input with a reveal toggle.
 *
 * The toggle is a real button with `aria-pressed` so keyboard and screen
 * reader users can tell whether the value is currently visible.
 */
const PasswordField = ({
  id,
  name,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  required = false,
  disabled = false,
  invalid = false,
  describedBy,
  onBlur,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="input-group">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        className="input"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        spellCheck="false"
      />

      <button
        type="button"
        className="input-group__action auth__reveal"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={0}
      >
        {visible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
      </button>
    </div>
  );
};

export default PasswordField;
