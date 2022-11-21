/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
/* eslint-disable no-empty */
import colors from 'colors';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId, ObjectID } from 'mongodb';

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
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        console.log(req.decoded);
        next();
    });
}

const run = async () => {
    try {
        const productCollection = client.db('inventory').collection('products');
        const orderCollection = client.db('inventory').collection('orders');
        // meetupOptionsCollection == heroName, time slots
        const meetupOptionsCollection = client.db('comix').collection('meetupOptions');
        const bookingsCollection = client.db('comix').collection('bookings');
        const usersCollection = client.db('comix').collection('users');

        // users api
        // all users GET
        app.get('/users', async (req, res) =>
            res.send(await usersCollection.find(req.body).toArray())
        );

        // Users POST operation
        app.post('/users', async (req, res) => {
            const { email } = req.body;
            const query = { email };
            const user = await usersCollection.findOne(query);

            if (user) {
                return res.send({ message: 'user already added' });
            }
            res.send(await usersCollection.insertOne(req.body));
        });

        // jwt for user
        app.get('/jwt', async (req, res) => {
            const { email } = req.query;
            const query = { email };
            console.log(email);

            const user = await usersCollection.findOne(query);
            console.log(user);

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: '1h',
                });
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: 'test token' });
        });
        // user  Setting admin role UPDATE Operation
        // app.put('/users/admin/:id', async (req, res) => {
        //     const { id } = req.params;
        //     const decodedEmail = req.decoded.email;
        //     const query = { email: decodedEmail };
        //     const user = await usersCollection.findOne(query);
        //     if (user?.role !== 'admin') {
        //         return res.status(403).send({ message: 'forbidden access' });
        //     }

        //     const filter = { _id: ObjectId(id) };
        //     const options = { upsert: true };
        //     const updatedDoc = {
        //         $set: {
        //             role: 'admin',
        //         },
        //     };
        //     const result = await usersCollection.updateOne(filter, updatedDoc, options);
        //     res.send(result);
        // });
        // admin role check GET operation
        // app.get('/users/admin/:email', async (req, res) => {
        //     const { email } = req.params;
        //     const query = { email };
        //     const user = await usersCollection.findOne(query);
        //     res.send({ isAdmin: user?.role === 'admin' });
        // });

        // booking data post operation
        app.get('/meetupOptions', async (req, res) => {
            // finding all available meetings options
            const allMeetupOptions = await meetupOptionsCollection.find({}).toArray();
            // booking query
            const { meetupDate } = req.query;
            console.log(meetupDate);

            const bookingQuery = { meetupDate };
            // already booked meetings options in a particular day: booked meetings options array
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
            // filtering booked meetings options from all available meetings options
            allMeetupOptions.forEach((option) => {
                const allOptionBooked = alreadyBooked.filter(
                    (optionBooked) => optionBooked.heroName === option.name
                );
                const bookedSlots = allOptionBooked.map((booked) => booked.timeSlot);
                const remainingSlots = option.slots.filter((slot) => !bookedSlots.includes(slot));
                option.slots = remainingSlots;
            });
            res.send(allMeetupOptions);
        });

        // GET all my bookings
        app.get('/bookings', verifyJWT, async (req, res) => {
            const { email } = req.query;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            console.log(req.headers.authorization);

            res.send(await bookingsCollection.find({ email }).toArray());
        });

        // booking POST operation
        app.post('/bookings', async (req, res) => {
            const { email, heroName, meetupDate } = req.body;

            const alreadyBooked = await bookingsCollection
                .find({ email, heroName, meetupDate })
                .toArray();

            if (alreadyBooked.length) {
                const message = `You already have a booking on ${meetupDate}`;
                return res.send({ acknowledged: false, message });
            }

            return res.send(await bookingsCollection.insertOne(req.body));
        });
        // all  products get operation
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
    res.send('test server');
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
