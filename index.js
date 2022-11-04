import colors from 'colors';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import productHandler from './routeHandler/productHandler.js';

// port and env
dotenv.config();
const app = express();
const port = process.env.PORT;
// middleware
app.use(cors());
app.use(express.json());

// Set up default mongoose connection
const mongoDB = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.5ty8ljz.mongodb.net/inventory?retryWrites=true&w=majority`;

const run = async () => {
    try {
        mongoose.connect(
            mongoDB,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            },
            () => console.log('db connected'.bgMagenta)
        );
    } catch (err) {
        console.log(err);
    }
};
run();
app.use('/product', productHandler);

colors.setTheme({
    info: 'green',
    help: 'cyan',
    warn: 'yellow',
    error: 'red',
});

// mongo connection
// const uri = 'mongodb://localhost:27017';
// const client = new MongoClient(uri);

// mongo functionality
// const run = async (req, res) => {
//     await client.connect();
//     console.log('db connected'.bgMagenta);
// };
// run();

app.get('/', (_req, res) => {
    res.send(' test server');
});
// Error middleware
// 404 handlers

app.use((req, res) => {
    res.status(404).send('404 error! url does not exist');
});

app.use((err, req, res, next) => {
    if (res.headerSent) {
        return next(err);
    }

    return res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log('Server running on port'.warn.italic, port);
});
