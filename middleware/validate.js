const mongoose = require('mongoose');

exports.validateObjectId = (paramNames) => {
  return (req, res, next) => {
    const paramsToCheck = Array.isArray(paramNames) ? paramNames : [paramNames];
    const invalidParams = [];

    paramsToCheck.forEach(param => {
      if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
        invalidParams.push(param);
      }
    });

    if (invalidParams.length > 0) {
      return res.status(400).json({
        error: `IDs invalides pour les paramètres: ${invalidParams.join(', ')}`
      });
    }

    next();
  };
};