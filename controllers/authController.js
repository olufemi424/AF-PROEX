const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const catchAsync = require('../utils/catchAsync');
const User = require('./../models/userModel');
const AppError = require('../utils/appError');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// create send token to user, and the user will use this token to perform actions, this token contains user details (userID)
// this is very useful, cos when we have many tokens needed for different services, we can always attach the token here
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    'expires': new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    'httpOnly': true
  };

  //only want cookie in production
  if (process.env.NODE_ENV === 'production') {
    cookieOptions['secure'] = true; // TODO: enable this for production
  }

  /**
   * attach cooking to respose when user try to login or signup, this will be catched by the cookie parser
   * this will set cookie on the browser with the assigned name 'jtw' in this case
   */
  res.cookie('jwt', token, cookieOptions);

  /**
   * remove the password from the output
   * sanitize the outgoing data after the cookie has been sent
   * to the user
   */
  user.password = undefined; /*eslint no-param-reassign: "error"*/
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user
    }
  });
};

/**
 * Only for rendering pages, no errors
 * this checkes to see if there is a user that is already
 * logged in by checking the cookies, and attaching the user object
 * to the body of the response
 */
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies && req.cookies.jwt) {
    try {
      // 1) Verification token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }

  next(); // in case no cookie call the next middleware
};

/**
 * protect ensures an un-authenticated user is not given access to
 * routes that they are not authenticated to see, such as
 * update password, updateprofile, deletemy endpoints
 */

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  //1) Getting token and check if its there
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please login to get access.', 401)
    );
  }
  //2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3)check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exist.', 401)
    );
  }

  //4) Check if user changed password after the token was issues
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please login again', 401)
    );
  }

  //grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser; //user data should be avaiable as an object in the template
  next();
});

/**
 * Sign up user
 */
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  // res.status(201).json({
  //   status: 'success',
  //   data: {
  //     user: newUser
  //   }
  // });
  createSendToken(newUser, 201, res);
});

/**
 * logout user by sending a dummy token that expirsed in 10seconds
 */
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    'expires': new Date(Date.now() + 10 * 1000),
    'httpOnly': true
  });

  res.status(200).json({ status: 'success' });
};

/**
 * restrict access tp unauthorized users
 * @param  {...any} roles these are roles of users, passed i
 * as arguements (see userModel.js to know the roles)
 */

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles ["admin", "lead-guide"]. role ='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perfome this action', 403)
      );
    }
    next();
  };
};

/**
 * Login into the app, using password and email
 */

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  //2) check if the user exist  and password is correct
  const user = await User.findOne({ email: email }).select('+password');
  //call User Model Instance method to reaturn a boolean
  /* compare password that was provided by the user, with the password 
  retrieved from the database with the users associated email
  */
  const isCorrect = user
    ? await user.correctPassword(password, user.password)
    : false;

  if (!user || !isCorrect) {
    return next(new AppError('Incorrect email or password'));
  }

  //3)
  /*  if everything is ok, send token to the client, 
  the token with which the user will make subsequent request, and this 
  token needs to be valid before the user can be given access to any auth required 
  routed
  */
  createSendToken(user, 201, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) get user based on posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }
  //2) Generate the random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //remove all validating
  //3) sent it to users email
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/reset-password/${resetToken}`;

  // const message = `Forgot your password? Submit a patch request with your new password and passowrdConfirm to ${resetUrl}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token(valid for 10mins)',
    //   message: message
    // });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
      resetUrl: resetUrl
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

//this function will only be successful if the it is called less than 10mins after forgot password is called
exports.resetPassword = catchAsync(async (req, res, next) => {
  console.log('here');
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() } //user is back before 10mins
  });

  //2) if token has not expired, and there is a user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired!', 400));
  }

  //3) Update changed password property in user model method
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //4) Log the user in and send JWT
  createSendToken(user, 201, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1.) Get user from collection
  const user = await User.findById(req.user.id).select('+password');
  //2.) check if the posted currrent password is correct
  console.log(req.body.passwordCurrent, user.password);
  if (!user.correctPassword(req.body.passwordCurrent, user.password)) {
    return next(new AppError('Your current password is wrong!', 401));
  }

  //3.) if so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();
  //user.findOneAndUpdate will not work here

  //4.) log user in, and send jwt.
  createSendToken(user, 201, res);
});
