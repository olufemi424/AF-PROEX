const AppError = require('../utils/appError');
// const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');

exports.deleteOne = Model => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('No Document found with that ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null
    });
  });
};

exports.updateOne = Model => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true //mongoose validator
    });

    if (!doc) {
      return next(new AppError('No Document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: doc
    });
  });
};

exports.createOne = Model => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });
};

/**
 * getone is a factory function to find one document in
 * the data base
 * @param { Object} Model database model
 * @param { Object } popOptions database populate options
 */
exports.getOne = (Model, popOptions) => {
  return catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = Model.findById(req.params.id).populate(popOptions);

    const doc = await query;

    if (!doc) {
      return next(new AppError('No doc found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: doc
    });
  });
};

exports.getAll = Model => { // this can be converted later to fetch all users for admin or whatever reasons
  return catchAsync(async (req, res) => {
    //to allow for nested GET reviews on tour(hack)
    let filter = {};
    // find reviews for a particular tour
    if (req.params.tourId) filter = { tour: req.params.tourId };

    //execute query
    const doc = await Model.find(filter);

    //send response
    res.status(200).json({
      status: 'succcess',
      results: doc.length,
      data: {
        data: doc
      }
    });
  });
};
