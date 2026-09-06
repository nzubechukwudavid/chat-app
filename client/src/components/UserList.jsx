import React, { useEffect, useState, useMemo } from 'react';
import { Avatar, useChatContext } from 'stream-chat-react';

const ListContainer = ({ children, searchTerm, setSearchTerm }) => {
  return (
    <div className="user-list__container">
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter team members..."
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div className="user-list__header">
        <p>User</p>
        <p>Select</p>
      </div>
      {children}
    </div>
  );
};

const UserItem = ({ user, selected, onToggle }) => {
  return (
    <div className='user-item__wrapper' onClick={onToggle}>
      <div className='user-item__name-wrapper'>
        <Avatar image={user.image} name={user.fullName || user.name || user.id} size={34} />
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '8px' }}>
          <p className="user-item__name">{user.fullName || user.name || user.id}</p>
          {user.name && user.name !== user.fullName && (
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>@{user.name}</span>
          )}
        </div>
      </div>
      <div className={`user-item__checkbox ${selected ? 'selected' : ''}`}>
        {selected && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </div>
  );
};

const UserList = ({ setSelectedUsers, selectedUsers = [] }) => {
  const { client } = useChatContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    const getUsers = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await client.queryUsers(
          { id: { $ne: client.userID } },
          { id: 1 },
          { limit: 50 }
        );

        if (isMounted) {
          setUsers(response.users || []);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (client) getUsers();

    return () => {
      isMounted = false;
    };
  }, [client]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase().trim();
    return users.filter((u) => {
      const name = (u.fullName || '').toLowerCase();
      const username = (u.name || '').toLowerCase();
      return name.includes(term) || username.includes(term);
    });
  }, [users, searchTerm]);

  const handleToggleUser = (userId) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  if (error) {
    return (
      <ListContainer searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
        <div className='user-list__message'>Error loading users, please try again.</div>
      </ListContainer>
    );
  }

  return (
    <ListContainer searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      {loading ? (
        <div className='user-list__message'>Loading team members...</div>
      ) : filteredUsers.length === 0 ? (
        <div className='user-list__message'>No team members found.</div>
      ) : (
        filteredUsers.map((user) => (
          <UserItem
            key={user.id}
            user={user}
            selected={selectedUsers.includes(user.id)}
            onToggle={() => handleToggleUser(user.id)}
          />
        ))
      )}
    </ListContainer>
  );
};

export default UserList;