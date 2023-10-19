const Fuse = require("fuse.js");

class SteamUtil {
  constructor() {
    this.appList = new Map();
    this.appListDate = 0;

    this.updateAppList();
  }

  async updateAppList() {
    let req = await fetch(
      "https://api.steampowered.com/ISteamApps/GetAppList/v2/"
    );
    let res = await req.json();

    let newAppList = new Map();
    for (const app of res.applist.apps) {
      newAppList.set(app.name, app.appid);
    }

    this.appList = newAppList;
    this.applistDate = Date.now();
  }

  async getAppList() {
    // If the list is older than 1 hour, update it
    if (Date.now() - this.appListDate > 60 * 60 * 1000) {
      await this.updateAppList();
    }

    return this.appList;
  }
}

const singleton = (() => {
  let instance;

  function createInstance() {
    instance = new SteamUtil();

    return instance;
  }

  return {
    /**
     * @returns {SteamUtil} steamUtil
     */
    getInstance() {
      return instance || createInstance();
    },
  };
})();

module.exports = singleton.getInstance();
