const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  buildid: String,
  timeupdated: String,
  pwdrequired: Boolean,
  description: String
}, {_id : false});

const AppSchema = new mongoose.Schema({
  id: Number,
  name: String,
  branches: {
    type: Map,
    of: BranchSchema
  }
});

const singleton = (() => {
  let instance;

  function createInstance() {
    instance = mongoose.model('App', AppSchema, 'apps');
    
    return instance;
  }

  return {
    /**
     * @returns {mongoose.Model} App
     */
    getInstance() {
      return instance || createInstance();
    }
  };
})();

module.exports = singleton.getInstance();
