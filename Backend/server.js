require('dotenv').config();
const express = require('express');
const connectTOdb = require('./database/db')
const cors = require('cors');
const authRouter = require('./routes/auth-route');
const homeRouter = require('./routes/home-route');

connectTOdb()
const app = express();
const PORT = process.env.PORT || 5000;

//middleware to parse data in json format
app.use(express.json());
app.use(cors());

app.use('/api/auth', authRouter);
app.use('/api/dashboard', homeRouter);

app.listen(PORT, () => {
    console.log(`Server is Running on Port ${PORT}`);
})