require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.js');
const { initDb } = require('./db.js');

const app = express();
const PORT = process.env.PORT || 5000;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const twilioClient = (accountSid && authToken) ? require('twilio')(accountSid, authToken) : null;

const vercelFrontendURL = process.env.VERCEL_FRONTEND_URL;
const corsOptions = {
    origin: ['http://localhost:3000', vercelFrontendURL].filter(Boolean),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('Rail Hub API is running!');
});

app.post('/', (req, res) => {
  const { message, user: sender, type, members } = req.body;

  if(type === 'message.new') {
    if (twilioClient && messagingServiceSid) {
      members
        .filter((member) => member.user_id !== sender.id)
        .forEach(({ user }) => {
          if(!user.online && user.phoneNumber) {
            twilioClient.messages.create({
              body: `You have a new message from ${message.user?.fullName || message.user?.name || 'a team member'} - ${message.text}`,
              messagingServiceSid: messagingServiceSid,
              to: user.phoneNumber,
            })
              .then(() => console.log('SMS notification dispatched!'))
              .catch((err) => console.error('Error dispatching SMS:', err.message));
          }
        });
    }

    return res.status(200).send('Message event processed');
  }

  return res.status(200).send('Not a new message request ');
});


app.use('/auth', authRoutes);

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

