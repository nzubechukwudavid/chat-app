// updateUsers.js
const StreamChat = require('stream-chat').StreamChat;

const apiKey = 'spz529r7wxmx';
const apiSecret = 'ata9s45bs3y52qjxx4h8gfakyc22fkmr9kqb89kkukpvhw7ucmek7fvptztctw5t';

const serverClient = StreamChat.getInstance(apiKey, apiSecret);

const updateAllUsers = async () => {
    try {
        console.log('Fetching all users...');
        
        // Get all users
        const { users } = await serverClient.queryUsers({});
        
        console.log(`Found ${users.length} users`);
        
        // Update each user to use 'image' instead of 'avatarURL'
        const usersToUpdate = users.map(user => ({
            id: user.id,
            set: {
                // Copy avatarURL to image if it exists
                image: user.avatarURL || user.image || '',
                // Keep other properties
                fullName: user.fullName || user.name || user.id,
                name: user.name || user.id,
            }
        }));
        
        if (usersToUpdate.length > 0) {
            console.log('Updating users...');
            const response = await serverClient.updateUsers(usersToUpdate);
            console.log('Successfully updated users:', response);
        }
        
    } catch (error) {
        console.error('Error updating users:', error);
    }
}

updateAllUsers();