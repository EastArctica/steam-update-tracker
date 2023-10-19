const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const steamUtil = require("../services/steamUtil");
const Fuse = require("fuse.js");
const Guild = require("../models/Guild");
const App = require("../models/App");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("games")
    .setDescription("Manage your monitored games")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a new game to be monitored")
        .addStringOption((option) =>
          option
            .setName("game")
            .setDescription("The name of the game to add")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a monitored game")
        .addStringOption((option) =>
          option
            .setName("game")
            .setDescription("The name of the game to remove")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("manage")
        .setDescription("Manage your monitored games")
        .addStringOption((option) =>
          option
            .setName("game")
            .setDescription("The name of the game to remove")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .setDMPermission(false),
  async execute(interaction) {
    let subcommand = interaction.options.getSubcommand();
    if (!this[subcommand]) {
      interaction.reply(
        "We're sorry. An error occured while executing your command. 🙁"
      );
    } else {
      this[subcommand](interaction);
    }
  },
  async add(interaction) {
    await interaction.deferReply({ ephemeral: false });

    let gameName = interaction.options.getString("game");
    let appList = await steamUtil.getAppList();

    let appIds = {};
    const fuse = new Fuse([...appList.keys()], {});
    const results = fuse.search(gameName);

    for (const result of results) {
      appIds[result.item] = appList.get(result.item);
    }
    appIds = Object.fromEntries(Object.entries(appIds).slice(0, 25));

    let options = [];
    for (const appName in appIds) {
      options.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(appName)
          .setDescription(`App ID: ${appIds[appName]}`)
          .setValue(appIds[appName].toString())
      );
    }

    if (options.length > 0) {
      const gameOptions = new StringSelectMenuBuilder()
        .setCustomId("game-search-options")
        .setPlaceholder("Select a game to add.")
        .addOptions(...options);
      const row = new ActionRowBuilder().addComponents(gameOptions);

      await interaction.editReply({ components: [row] });
    } else {
      await interaction.editReply({ content: "No games found." });
    }
  },
  async remove(interaction) {
    // TODO: This entire section needs to be swapped over to providing the user with both the appId and app name, because multiple games can have the same name.
    // Add the new game to the guild's db
    let guild = await Guild.findOne({
      id: interaction.guildId,
      "channels.id": interaction.channelId,
    });

    // If we don't have any apps for the current channel, there's nothing to be removed.
    let channel;
    if (
      !guild ||
      !(channel = guild.channels.find(
        (channel) => channel.id == interaction.channelId
      )) ||
      channel.apps.length == 0
    ) {
      await interaction.reply({
        content:
          "Looks like you don't have any games being monitored in this channel.",
        ephemeral: false,
      });
      return;
    }

    // If we don't have the game they asked for... well... It can't be removed.
    let removedGame = channel.apps.find(
      (app) => app.name == interaction.options.getString("game")
    );
    if (!removedGame) {
      await interaction.reply({
        content: "You're not currently tracking that game.",
        ephemeral: false,
      });
      return;
    }

    // Remove the game from the guild
    // TODO: I think there's a better way to do this
    channel.apps = channel.apps.filter((app) => app !== removedGame);

    await guild.save();
    // TODO: Update to embed :upside_down:
    await interaction.reply({
      content: `Successfully removed \`${removedGame.name}\` \`(${removedGame.id})\``,
      ephemeral: false,
    });
  },
  async autocomplete(interaction) {
    switch (interaction.options.getSubcommand()) {
      case "manage":
      case "remove":
        const focusedValue = interaction.options.getFocused();

        let guild = await Guild.findOne({
          id: interaction.guildId,
          "channels.id": interaction.channelId,
        });
        let channel;
        // If we don't have any apps for the current channel, there's nothing to be removed.
        if (
          !guild ||
          !(channel = guild.channels.find(
            (channel) => channel.id == interaction.channelId
          )) ||
          channel.apps.length == 0
        ) {
          interaction.respond([]);
          return;
        }

        const fuse = new Fuse(channel.apps, { keys: ["name"] });
        let results = fuse.search(focusedValue);
        if (focusedValue == "") {
          results = channel.apps.map((app) => ({ item: app }));
        }

        await interaction.respond(
          results.map((result) => ({
            name: result.item.name,
            value: result.item.name,
          }))
        );
        break;
      default:
        await interaction.autocomplete("Error");
        break;
    }
  },
  async manage(interaction) {
    await interaction.deferReply({ ephemeral: false });

    // TODO: This entire section needs to be swapped over to providing the user with both the appId and app name, because multiple games can have the same name.
    let guild = await Guild.findOne({
      id: interaction.guildId,
      "channels.id": interaction.channelId,
    });

    // If we don't have any apps for the current channel, there's nothing to be managed.
    let channel;
    if (
      !guild ||
      !(channel = guild.channels.find(
        (channel) => channel.id == interaction.channelId
      )) ||
      channel.apps.length == 0
    ) {
      // TODO: Update to embed
      await interaction.editReply({
        content:
          "Looks like you don't have any games being monitored in this channel.",
      });
      return;
    }

    // If we don't have the game they asked for... well... It can't be managed.
    let channelApp = channel.apps.find(
      (app) => app.name == interaction.options.getString("game")
    );
    if (!channelApp) {
      // TODO: Update to embed
      await interaction.editReply({
        content: "You're not currently tracking that game.",
      });
      return;
    }

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
            .setDefault(channelApp.branches.includes(atob(branchB64)))
        )
      )
      .setMinValues(1)
      .setMaxValues(app.branches.size);

    const row = new ActionRowBuilder().addComponents(gameOptions);

    await interaction.editReply({ components: [row] });
  },
};
