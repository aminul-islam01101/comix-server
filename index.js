/* eslint-disable no-empty */
import colors from 'colors';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { MongoClient, ObjectID } from 'mongodb';

// port and env
dotenv.config();
const app = express();
const port = process.env.PORT;
// middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// Set up default mongoose connection
const mongoDB = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.5ty8ljz.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(mongoDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const run = async () => {
    try {
        const productCollection = client.db('inventory').collection('products');
        const orderCollection = client.db('inventory').collection('orders');
        const meetupOptionsCollection = client.db('comix').collection('meetupOptions');

        app.get('/meetupOptions', async (req, res) =>
            res.send(await meetupOptionsCollection.find({}).toArray())
        );

        app.get('/products', async (req, res) => {
            const query = {};
            const page = Number(req.query.page);
            const size = Number(req.query.size);
            console.log(page, size);

            const cursor = productCollection.find(query);
            // const products = await cursor.limit(10).toArray();
            const products = await cursor
                .skip(page * size)
                .limit(size)
                .toArray();
            const count = await productCollection.estimatedDocumentCount();

            res.send({ count, products });
        });
        app.get('/products/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: ObjectID(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });
    } finally {
    }
};
run().catch((err) => console.log(err));

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
    console.log('Server running on ports'.warn.italic, port);
});
