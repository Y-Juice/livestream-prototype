import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    trim: true
  },
  channel_name: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    unique: true
  }
});

const Video = mongoose.model('Video', videoSchema);

export default Video; 