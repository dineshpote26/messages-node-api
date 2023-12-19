const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const Post = require('../models/post');
const User = require('../models/user');

const { error } = require('console');

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 3;
    try {
        const totalItem = await Post.find().countDocuments();
        const posts = await Post.find().populate('creator').skip((currentPage - 1) * perPage).limit(perPage);
        return res.status(200).json({ message: 'Fetched Post Successfully', posts: posts, totalItems: totalItem })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.createPost = async (req, res, next) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        const error = new Error('Validation failed,entered data is incorrect.');
        error.status = 422
        throw error;
    }

    if (!req.file) {
        const error = new Error('No image provided.');
        error.status = 422
        throw error;
    }
    const imageUrl = req.file.path;
    const title = req.body.title;
    const content = req.body.content;
    let creator;

    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId,
    });

    try {
        await post.save();
        const user = await User.findById(req.userId);
        creator = user;
        user.posts.push(post);
        user.save();
        return res.status(201).json({
            message: "Post created successfully!",
            post: post,
            creator: { _id: user._id, name: user.name }
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error;
        }
        return res.status(200).json({ message: 'Post fetched', post: post });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updatePost = async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const error = validationResult(req);
        if (!error.isEmpty()) {
            const error = new Error('Validation failed,entered data is incorrect.');
            error.status = 422
            throw error;
        }
        const title = req.body.title;
        const content = req.body.content;
        let imageUrl = req.body.image;
        if (req.file) {
            imageUrl = req.file.path;
        }
        if (!imageUrl) {
            const error = new Error('No file pick');
            error.statusCode = 404;
            throw error;
        }
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId) {
            const error = new Error('Not authorize');
            error.statusCode = 403;
            throw error;
        }
        if (imageUrl !== post.imageUrl) {
            clearImage(post.imageUrl);
        }
        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        const result = await post.save();
        return res.status(200).json({
            message: 'Post update successfully',
            post: post

        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId) {
            const error = new Error('Not authorize');
            error.statusCode = 403;
            throw error;
        }
        console.log("imageurl", post.imageUrl);
        clearImage(post.imageUrl);
        await Post.findByIdAndDelete(postId);
        const user = await User.findById(req.userId);
        user.posts.pull(postId);
        await user.save()
        return res.status(200).json({ message: 'Deleted' });
    } catch (err) {
        console.log("err==", err);
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, error => console.log(error));
}