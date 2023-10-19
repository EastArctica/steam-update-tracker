const mongoose = require("mongoose");

const ChannelAppSchema = new mongoose.Schema(
  {
    branches: [String],
    id: String,
    name: String,
  },
  { _id: false }
);

const GuildChannelSchema = new mongoose.Schema(
  {
    id: String,
    apps: {
      type: Array,
      of: ChannelAppSchema,
    },
  },
  { _id: false }
);

const GuildSchema = new mongoose.Schema({
  id: String,
  channels: {
    type: Array,
    of: GuildChannelSchema,
  },
});

const singleton = (() => {
  let instance;

  function createInstance() {
    instance = mongoose.model("Guild", GuildSchema, "guilds");

    return instance;
  }

  return {
    /**
     * @returns {mongoose.Model} Guild
     */
    getInstance() {
      return instance || createInstance();
    },
  };
})();

module.exports = singleton.getInstance();
