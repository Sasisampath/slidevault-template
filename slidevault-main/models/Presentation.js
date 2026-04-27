// models/Presentation.js  —  MongoDB Schema
const mongoose = require('mongoose');

const PresentationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title too long'],
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
    },
    institution: { type: String, default: '', trim: true },
    cat: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['cs','math','physics','business','biology','engineering','social','design'],
    },
    desc:       { type: String, required: [true, 'Description is required'], trim: true },
    tags:       { type: [String], default: [] },
    slideCount: { type: Number, default: 20, min: 1 },
    access:     { type: String, enum: ['free','preview','request'], default: 'free' },
    filename:   { type: String, default: '' }, // saved file on disk via multer
    downloads:  { type: Number, default: 0 },
    views:      { type: Number, default: 0 },
    likes:      { type: Number, default: 0 },
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

module.exports = mongoose.model('Presentation', PresentationSchema);
