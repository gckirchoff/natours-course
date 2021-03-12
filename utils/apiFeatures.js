class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // Look up if the below blocks the event loop...

    // Build query and filtering
    // const queryObj = { ...this.queryString };
    // const excludedFields = ['page', 'sort', 'limit', 'fields'];
    // excludedFields.forEach((el) => delete queryObj[el]);

    let { page, sort, limit, fields, ...queryObj } = this.queryString;

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    let { page, sort, limit, fields, ...queryObj } = this.queryString;
    if (sort) {
      const sortBy = sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-ratingsAverage');
    }

    return this;
  }

  limitFields() {
    let { page, sort, limit, fields, ...queryObj } = this.queryString;
    if (fields) {
      fields = fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    let { page, sort, limit, fields, ...queryObj } = this.queryString;
    page = this.queryString.page * 1 || 1; // Default page is 1
    limit = this.queryString.limit * 1 || 100; // Default limit is 1
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
