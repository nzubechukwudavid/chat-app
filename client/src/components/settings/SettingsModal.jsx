import React, { useEffect, useRef, useState } from 'react';

import Avatar from '../ui/Avatar';
import { CloseIcon } from '../ui/icons';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
];

const ProfileForm = ({ user, onUpdateProfile, onUploadAvatar, notify }) => {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [avatarURL, setAvatarURL] = useState(user?.avatarURL || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await onUpdateProfile({ fullName, phoneNumber, avatarURL });
    setSaving(false);
    if (res?.ok) {
      notify?.({ type: 'success', message: 'Profile updated.' });
    } else if (res?.error) {
      notify?.({ type: 'error', message: res.error });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!onUploadAvatar) return;
    setUploading(true);
    const res = await onUploadAvatar(file);
    setUploading(false);
    if (res?.ok && res.avatarURL) {
      setAvatarURL(res.avatarURL);
      notify?.({ type: 'success', message: 'Avatar uploaded. Save to apply.' });
    } else if (res?.error) {
      notify?.({ type: 'error', message: res.error });
    }
    e.target.value = '';
  };

  const displayName = fullName || user?.username || 'Rail Officer';

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="settings-avatar-preview">
        <Avatar name={displayName} image={avatarURL || user?.avatarURL} size={64} online />
      </div>

      <div className="settings-avatar-upload">
        <label className="settings-upload-btn">
          {uploading ? 'Uploading...' : 'Upload avatar'}
          <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
        </label>
        <span className="settings-upload-hint">JPG, PNG, GIF, WebP (max 2MB)</span>
      </div>

      <label className="settings-field">
        <span>Full name</span>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" maxLength={100} />
      </label>

      <label className="settings-field">
        <span>Username</span>
        <input value={user?.username || ''} disabled readOnly />
      </label>

      <label className="settings-field">
        <span>Phone number</span>
        <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1234567890" maxLength={20} />
      </label>

      <label className="settings-field">
        <span>Avatar URL</span>
        <input value={avatarURL} onChange={(e) => setAvatarURL(e.target.value)} placeholder="https://..." maxLength={512} />
      </label>

      <div className="settings-actions">
        <button type="submit" className="settings-btn settings-btn--primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

const PasswordForm = ({ onChangePassword, notify }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      notify?.({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      notify?.({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }
    setSaving(true);
    const res = await onChangePassword({ currentPassword, newPassword });
    setSaving(false);
    if (res?.ok) {
      notify?.({ type: 'success', message: res.message || 'Password updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } else if (res?.error) {
      notify?.({ type: 'error', message: res.error });
    }
  };

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <label className="settings-field">
        <span>Current password</span>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      </label>

      <label className="settings-field">
        <span>New password</span>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
      </label>

      <label className="settings-field">
        <span>Confirm new password</span>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
      </label>

      <div className="settings-actions">
        <button type="submit" className="settings-btn settings-btn--primary" disabled={saving}>
          {saving ? 'Updating...' : 'Change password'}
        </button>
      </div>
    </form>
  );
};

const SettingsModal = ({ open, onClose, user, onUpdateProfile, onChangePassword, onUploadAvatar, notify }) => {
  const [tab, setTab] = useState('profile');
  const modalRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const modal = modalRef.current;
    const focusable = () => Array.from(
      modal?.querySelectorAll('button, input, select, textarea, a[href]') || [],
    ).filter((element) => !element.disabled && element.getClientRects().length > 0);

    const initialFocus = window.setTimeout(() => modal?.focus(), 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(initialFocus);
      document.removeEventListener('keydown', handleKeyDown, true);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={onClose}>
      <div className="settings-modal" ref={modalRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <header className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="settings-close" onClick={onClose} aria-label="Close settings">
            <CloseIcon size={18} />
          </button>
        </header>

        <div className="settings-tabs" role="group" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`settings-tab${tab === t.id ? ' settings-tab--active' : ''}`}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {tab === 'profile' && <ProfileForm user={user} onUpdateProfile={onUpdateProfile} onUploadAvatar={onUploadAvatar} notify={notify} />}
          {tab === 'security' && <PasswordForm onChangePassword={onChangePassword} notify={notify} />}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
