const SteamUser = require("steam-user");

const singleton = (() => {
  let instance;

  function createInstance() {
    instance = new SteamUser();
    instance.logOn({ anonymous: true });

    return instance;
  }

  return {
    /**
     * @returns {SteamUser} steamUser
     */
    getInstance() {
      return instance || createInstance();
    },
  };
})();

module.exports = singleton.getInstance();
