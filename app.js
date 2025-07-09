const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;
const JWT_SECRET = ''; // Use your JWT Secret Key here

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('EcoCity');
  const users = db.collection('users');
  const dashboard = db.collection('dashboard');
  const rewards = db.collection('rewards');
  const otpCollection = db.collection('otps');
  const reports = db.collection('reports');

  // Request OTP
  app.post('/api/request-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await otpCollection.updateOne(
      { email },
      { $set: { otp, expiresAt, verified: false } },
      { upsert: true }
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: '', // give you mail id here
        pass: '' // Use an App Password, not your Gmail password
      }
    });

    try {
      await transporter.sendMail({
        from: '"EcoCity OTP" < >',//give your mail id here
        to: email,
        subject: 'Your EcoCity OTP Code',
        text: `Your OTP is: ${otp}. It is valid for 10 minutes.`
      });
      res.json({ message: 'OTP sent' });
    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
  });

  // Verify OTP
  app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

    const record = await otpCollection.findOne({ email, otp, verified: false });
    if (!record) return res.status(400).json({ message: 'Invalid OTP' });
    if (new Date() > record.expiresAt) return res.status(400).json({ message: 'OTP expired' });

    await otpCollection.updateOne({ email, otp }, { $set: { verified: true } });
    res.json({ message: 'OTP verified' });
  });

  // Register with OTP
  app.post('/api/register', async (req, res) => {
    const { email, password, otp } = req.body;
    if (!email || !password || !otp) return res.status(400).json({ message: 'Email, password, and OTP required' });

    const otpRecord = await otpCollection.findOne({ email, otp, verified: true });
    if (!otpRecord) return res.status(400).json({ message: 'OTP not verified' });

    const userExists = await users.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await users.insertOne({ email, password: hashedPassword });

    await dashboard.insertOne({
      email,
      smartBins: 0,
      wasteCollected: 0,
      recyclingRate: 0,
      ecoVolunteers: 0
    });
    await rewards.insertOne({
      email,
      userName: email.split('@')[0],
      rewardPoints: 0
    });

    await otpCollection.deleteOne({ email, otp });

    res.json({ message: 'User registered' });
  });

  // Login
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await users.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  });

  // Auth middleware
  function auth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid token' });
      req.user = user;
      next();
    });
  }

  // Protected endpoints
  app.get('/api/dashboard', auth, async (req, res) => {
    const dashboardData = await dashboard.findOne({ email: req.user.email });
    res.json(dashboardData || {});
  });

  app.get('/api/rewards', auth, async (req, res) => {
    const rewardsData = await rewards.findOne({ email: req.user.email });
    res.json(rewardsData || {});
  });

  // Report an Issue
  app.post('/api/report', async (req, res) => {
    try {
      const { name, email, category, description, image } = req.body;
      if (!name || !email || !category || !description) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
      }
      const report = { name, email, category, description, image, createdAt: new Date() };
      await reports.insertOne(report);
      res.json({ message: 'Issue submitted successfully!' });
    } catch (error) {
      console.error('Error saving report:', error);
      res.status(500).json({ message: 'Failed to submit issue.' });
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
