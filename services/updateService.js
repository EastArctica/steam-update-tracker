const steamUser = require("./steamUser");
const App = require("../models/App");
const { atob, btoa } = require("./util");

async function updateApps() {
  const appList = await App.find({});
  let allProducts = await steamUser.getProductInfo(
    appList.map((app) => app.id),
    [],
    true
  );

  let appUpdates = {};
  for (const appID in allProducts.apps) {
    const steamApp = allProducts.apps[appID];
    const dbApp = appList.find((appListApp) => appListApp.id === Number(appID));

    let appHasUpdates = false;
    let appUpdate = {
      name: steamApp.appinfo.common.name,
      // branches is a list of the branches that have updated
      branches: {},
    };

    // Some apps don't have depots...? Like this one https://steamdb.info/app/980030/
    if (!steamApp.appinfo.depots) {
      continue;
    }

    // TODO: If a branch is removed, that becomes an issue...
    for (const branchName in steamApp.appinfo.depots.branches) {
      // If this branch hasn't been seen before, add a default object for the branch.
      if (!dbApp.branches.get(btoa(branchName))) {
        dbApp.branches.set(btoa(branchName), {});
      }

      let branch = steamApp.appinfo.depots.branches[branchName];
      let dbBranch = {
        buildid: branch.buildid,
        timeupdated: branch.timeupdated,
        pwdrequired: branch.pwdrequired == "1",
        description: branch.description || "",
      };

      if (
        branch.timeupdated !== dbApp.branches.get(btoa(branchName)).timeupdated
      ) {
        appHasUpdates = true;
        appUpdate.branches[branchName] = dbBranch;
      }

      dbApp.branches.set(btoa(branchName), dbBranch);
    }

    // Update the app's name if it's changed
    if (steamApp.appinfo.common.name !== dbApp.name) {
      appHasUpdates = true;
      dbApp.name = steamApp.appinfo.common.name;
    }

    if (appHasUpdates) {
      appUpdates[appID] = appUpdate;
    }

    await dbApp.save();
  }

  return appUpdates;
}

module.exports = updateApps;
