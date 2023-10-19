const {
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} = require("discord.js");
const steamUtil = require("../services/steamUtil");
const Guild = require("../models/Guild");
const App = require("../models/App");
const { atob } = require("../services/util");

module.exports = async (client, interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: false,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: false,
        });
      }
    }
  } else if (interaction.isButton()) {
  } else if (interaction.isStringSelectMenu()) {
    // TODO: this is baddddd, move this elsewhere PLEASE
    switch (interaction.customId) {
      case "game-search-options": {
        await interaction.deferUpdate();

        let appID = interaction.values[0];
        let appName = "Unknown";
        for (const [key, value] of steamUtil.appList) {
          if (value == appID) {
            appName = key;
            break;
          }
        }

        // Add the new game to the guild's db
        let guild = await Guild.findOne({ id: interaction.guildId });
        if (!guild) {
          guild = new Guild({ id: interaction.guildId });
        }

        if (
          !guild.channels.some((channel) => channel.id == interaction.channelId)
        ) {
          guild.channels.push({ id: interaction.channelId, apps: [] });
        }

        let channel = guild.channels.find(
          (channel) => channel.id == interaction.channelId
        );
        if (!channel.apps.some((app) => app.id == appID)) {
          channel.apps.push({ id: appID, branches: ["public"], name: appName });
          await guild.save();
        } else {
          // This game is already being tracked in this channel
          await interaction.editReply({
            content: "This game is already being tracked in this channel.",
            components: [],
          });

          // We might as well update the name if it's changed
          channel.apps.find((app) => app.id == appID).name = appName;

          await guild.save();
          return;
        }

        // If we haven't ever seen this game before, add it to the apps db as well
        if (!(await App.findOne({ id: appID }))) {
          let app = new App({ id: appID, name: appName, branches: [] });
          await app.save();
        }

        // TODO: I don't really like the look of this embed, it seems more like what I'd see in something like /lookup-game
        let embed = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle(appName)
          .setURL(`https://steamdb.info/app/${appID}/`)
          .setAuthor({
            name: "SteamDB",
            iconURL: "https://steamdb.info/static/logos/512px.png",
            url: "https://steamdb.info/",
          })
          .setThumbnail(
            `https://cdn.cloudflare.steamstatic.com/steam/apps/${appID}/capsule_sm_120.jpg?t=${Date.now()}`
          )
          .addFields(
            { name: "Name", value: appName, inline: true },
            { name: "App ID", value: appID, inline: true }
          )
          .setTimestamp()
          .setFooter({
            text: "SteamDB",
            iconURL: "https://steamdb.info/static/logos/512px.png",
          });

        await interaction.editReply({ embeds: [embed], components: [] });
        break;
      }
      case "branch-select-options": {
        await interaction.deferUpdate();

        let guild = await Guild.findOne({
          id: interaction.guildId,
          "channels.id": interaction.channelId,
        });
        if (!guild) {
          guild = new Guild({ id: interaction.guildId });
        }

        let channel = guild.channels.find(
          (channel) => channel.id == interaction.channelId
        );
        let appID = interaction.values[0].split("-")[0];
        let values = interaction.values.map((value) =>
          value.slice(value.indexOf("-") + 1)
        );
        let channelApp = channel.apps.find((app) => app.id == appID);
        console.log(appID, values);

        channelApp.branches = values;
        await guild.save();

        let app = await App.findOne({ id: channelApp.id });
        if (!app) {
          // TODO: Update to embed
          await interaction.editReply({ content: "An error occured." });
          return;
        }

        const gameOptions = new StringSelectMenuBuilder()
          .setCustomId("branch-select-options")
          .setPlaceholder("Select a branch to add.")
          .addOptions(
            ...[...app.branches.keys()].map((branchB64) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(atob(branchB64))
                .setValue(`${app.id}-${atob(branchB64)}`)
                .setDefault(channelApp.branches.includes(branchB64))
            )
          )
          .setMinValues(1)
          .setMaxValues(app.branches.size);

        const row = new ActionRowBuilder().addComponents(gameOptions);

        await interaction.editReply({ components: [row] });
        break;
      }
      default: {
        console.error(
          `No string select menu matching ${interaction.customId} was found.`
        );
        break;
      }
    }
  } else if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(error);
    }
  }
};
