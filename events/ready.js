const { EmbedBuilder } = require("discord.js");
const steamUser = require("../services/steamUser");
const updateApps = require("../services/updateService");
const Guild = require("../models/Guild");

module.exports = async (client) => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Wait to ensure the steam client is logged in
  while (!steamUser.steamID) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // TODO: look into using appUpdate event instead of polling
  setInterval(async () => {
    const appUpdates = await updateApps();

    console.log("got updates");
    // Find all guilds with apps that have been updated
    const guilds = await Guild.find({
      "channels.apps.id": { $in: Object.keys(appUpdates) },
    });
    for (const appID in appUpdates) {
      const app = appUpdates[appID];
      for (const guild of guilds) {
        for (const channel of guild.channels) {
          // Only send updates to channels that have subscribed to the app
          if (!channel.apps.some((app) => app.id === appID)) {
            continue;
          }

          let embeds = [];
          for (const branchName in app.branches) {
            // Only add the branch if the user has subscribed to it's updates
            if (
              !channel.apps.some(
                (app) => app.id === appID && app.branches.includes(branchName)
              )
            ) {
              continue;
            }
            const branch = app.branches[branchName];
            embeds.push(
              new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle(app.name)
                .setURL(`https://steamdb.info/patchnotes/${branch.buildid}/`)
                .setAuthor({
                  name: "SteamDB",
                  iconURL: "https://steamdb.info/static/logos/512px.png",
                  url: "https://steamdb.info/",
                })
                .setDescription(`\`${branchName}\` has updated!`)
                .setThumbnail(
                  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appID}/capsule_sm_120.jpg?t=${Date.now()}`
                )
                .addFields(
                  {
                    name: "Build ID",
                    value: branch.buildid || "Unknown",
                    inline: true,
                  },
                  {
                    name: "Last Updated",
                    value: branch.timeupdated
                      ? `<t:${branch.timeupdated}:f>`
                      : "Never",
                    inline: true,
                  },
                  {
                    name: "Password Required",
                    value: branch.pwdrequired ? "Yes" : "No",
                    inline: true,
                  },
                  {
                    name: "Description",
                    value: branch.description || "None",
                    inline: false,
                  }
                )
                .setTimestamp()
                .setFooter({
                  text: "SteamDB",
                  iconURL: "https://steamdb.info/static/logos/512px.png",
                })
            );
          }

          // If there are more than 10 branches, we need to split the embeds into multiple messages
          for (let i = 0; i < embeds.length; i += 10) {
            await client.channels.cache
              .get(channel.id)
              .send({ embeds: embeds.slice(i, i + 10) });
          }
        }
      }
    }
  }, 10 * 1000); // 60 * 1000 ms = 1 min
};
