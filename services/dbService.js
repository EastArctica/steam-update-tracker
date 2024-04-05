const mongoose = require("mongoose");

const singleton = (() => {
  let instance;

  function createInstance() {
    mongoose.connect(process.env.MONGO_URI, {
      authSource: "admin"
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
