/* eslint-disable new-cap */
import express from 'express';
import mongoose from 'mongoose';
import productSchema from '../schemas/productSchema.js';

const router = express.Router();

const Product = new mongoose.model('service', productSchema);

router.post('/', async (req, res) => {
    const newProduct = new Product(req.body);
    await newProduct.save((err) => {
        if (err) {
            res.status(500).json({
                error: 'There was a server side error!',
            });
        } else {
            res.status(200).json({
                message: 'Todo was inserted successfully!',
            });
        }
    });
});

export default router;
