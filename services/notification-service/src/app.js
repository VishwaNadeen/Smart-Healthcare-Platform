const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/notifications', require('./routes/notification.routes'));

app.get('/health', (req, res) => res.json({ status: 'Notification Service Running' }));

const PORT = process.env.PORT || 5007;
app.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));