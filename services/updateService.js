const steamUser = require("./steamUser");
const App = require("../models/App");

async function updateApps() {
  const appList = await App.find({});
  let result = await steamUser.getProductInfo(
    appList.map((app) => app.id),
    [],
    true
  );

  let appUpdates = {};
  for (const appID in result.apps) {
    const steamApp = result.apps[appID];
    const dbApp = appList.find((appListApp) => appListApp.id === Number(appID));

    let hasUpdated = false;
    let appUpdate = {
      name: steamApp.appinfo.common.name,
      branches: {},
    };

    // Some apps don't have depots...? Like this one https://steamdb.info/app/980030/
    if (!steamApp.appinfo.depots) {
      continue;
    }

    // TODO: If a branch is removed, that becomes an issue...
    console.log(steamApp.appinfo.depots.branches);
    for (const branch in steamApp.appinfo.depots.branches) {
      // Check if branch is in dbApp
      if (!dbApp.branches.get(branch)) {
        dbApp.branches.set(branch, {});
      }

      let branchInfo = steamApp.appinfo.depots.branches[branch];
      let dbBranch = {
        buildid: branchInfo.buildid,
        timeupdated: branchInfo.timeupdated,
        pwdrequired: branchInfo.pwdrequired == "1",
        description: branchInfo.description || "",
      };

      if (branchInfo.timeupdated !== dbApp.branches.get(branch).timeupdated) {
        hasUpdated = true;
        appUpdate.branches[branch] = dbBranch;
      }

      dbApp.branches.set(branch, dbBranch);
    }

    // Update the app's name if it's changed
    if (steamApp.appinfo.common.name !== dbApp.name) {
      hasUpdated = true;
      dbApp.name = steamApp.appinfo.common.name;
    }

    if (hasUpdated) {
      appUpdates[appID] = appUpdate;
    }

    await dbApp.save();
  }

  return appUpdates;
}

module.exports = updateApps;
