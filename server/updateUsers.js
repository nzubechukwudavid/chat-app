// updateUsers.js
const StreamChat = require('stream-chat').StreamChat;

// IMPORTANT: Replace with your actual Stream API Key and Secret
const apiKey = 'spz529r7wxmx';
const apiSecret = 'ata9s45bs3y52qjxx4h8gfakyc22fkmr9kqb89kkukpvhw7ucmek7fvptztctw5t';

// Initialize the server client
const serverClient = StreamChat.getInstance(apiKey, apiSecret);

// Define the users you want to update
// Find the user IDs in your Stream Explorer
const usersToUpdate = [
    {
        id: '5d54af827c5c61df1f0f67d770710d5c',      // Replace with the actual user ID
        set: {
            fullName: 'John Doe' // Replace with the correct full name
        }
    },
    
    // Add more users here if needed
];

const update = async () => {
    try {
        console.log('Updating users...');
        const response = await serverClient.updateUsers(usersToUpdate);
        console.log('Successfully updated users:', response);
    } catch (error) {
        console.error('Error updating users:', error);
    }
}

update();
