const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name']
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'Please provide your email'],
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
    message: 'Please provide a valid password!'
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      //this only work on CREATE | SAVE!!!
      validator: function(el) {
        return el === this.password;
      },
      message: 'Password are not the same!'
    }
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'guide', 'lead-guide', 'admin']
    },
    default: 'user'
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

//Query middleware
userSchema.pre('save', async function(next) {
  //Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  //Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  //delete the password confirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next(); // if password is not modified, go to next

  this.passwordChangedAt = Date.now() - 1000; //edge case for hashing taking too long
  next();
});

/* 
  this is to provide cases for users who are being deleted
  still want to keep the data of the deleted users
  never delete aa user from the database
*/
userSchema.pre(/^find/, function(next) {
  //this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

/* 
  Correct password method returns a boolean
  when the user is trying to change the password, it needs 
  to compare the old one with what is saved in the database
*/
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/* 
  change password after, checks if the user is logged in bust just changed
  password, return a boolean, to enable a force resignin with the new password
*/
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = this.passwordChangedAt.getTime() / 1000;

    return JWTTimestamp < changedTimestamp;
  }
  //false means not changed
  return false;
};

/* 
  reset password method, create an encrypted password and set a timer, 
  giving the user some time to reset their passsword, else we keep the 
  old password, come back and reset.
*/
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //10mins milisec

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
