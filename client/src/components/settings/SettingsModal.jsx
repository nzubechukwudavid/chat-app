import React, { useState } from 'react';

import Avatar from '../ui/Avatar';
import { CloseIcon } from '../ui/icons';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'account', label: 'Account' },
];

const ProfileForm = ({ user, onUpdateProfile, notify }) => {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [avatarURL, setAvatarURL] = useState(user?.avatarURL || '');
  const [saving, setSaving] = useState(false);

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

  const displayName = fullName || user?.username || 'Rail Officer';

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="settings-avatar-preview">
        <Avatar name={displayName} image={avatarURL || user?.avatarURL} size={64} online />
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

const DangerZone = ({ onDeleteAccount, notify }) => {
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      notify?.({ type: 'error', message: 'Type DELETE to confirm.' });
      return;
    }
    setDeleting(true);
    const res = await onDeleteAccount({ confirm: true, password: password || undefined });
    setDeleting(false);
    if (res?.ok) {
      notify?.({ type: 'success', message: res.message || 'Account deleted.' });
    } else if (res?.error) {
      notify?.({ type: 'error', message: res.error });
    }
  };

  return (
    <div className="settings-form">
      <div className="settings-danger">
        <h3>Delete account</h3>
        <p>This action is irreversible. All your data will be removed.</p>
        <label className="settings-field">
          <span>Type DELETE to confirm</span>
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
        </label>
        <label className="settings-field">
          <span>Password (optional)</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <div className="settings-actions">
          <button type="button" className="settings-btn settings-btn--danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete account'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsModal = ({ open, onClose, user, onUpdateProfile, onChangePassword, onDeleteAccount, notify }) => {
  const [tab, setTab] = useState('profile');

  if (!open) return null;

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <header className="settings-header">
          <h2>Settings</h2>
          <button type="button" className="settings-close" onClick={onClose} aria-label="Close settings">
            <CloseIcon size={18} />
          </button>
        </header>

        <div className="settings-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`settings-tab${tab === t.id ? ' settings-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {tab === 'profile' && <ProfileForm user={user} onUpdateProfile={onUpdateProfile} notify={notify} />}
          {tab === 'security' && <PasswordForm onChangePassword={onChangePassword} notify={notify} />}
          {tab === 'account' && <DangerZone onDeleteAccount={onDeleteAccount} notify={notify} />}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
