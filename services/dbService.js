const mongoose = require("mongoose");
const { MONGODB_URI } = require("../config");

const singleton = (() => {
  let instance;

  function createInstance() {
    mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    instance = mongoose.connection;

    instance.on(
      "error",
      console.error.bind(console, "MongoDB connection error:")
    );

    return instance;
  }

  return {
    /**
     * @returns {mongoose.Connection} db
     */
    getInstance() {
      return instance || createInstance();
    },
  };
})();

module.exports = singleton.getInstance();
