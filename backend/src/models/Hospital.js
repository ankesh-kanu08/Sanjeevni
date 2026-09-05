import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['district', 'phc', 'chc', 'private', 'tertiary'], required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  address: String,
  district: String,
  state: String,
  pincode: String,
  contactInfo: {
    phone: String,
    email: String
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

hospitalSchema.index({ location: '2dsphere' });

export default mongoose.model('Hospital', hospitalSchema);
