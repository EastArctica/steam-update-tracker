const { Client, Collection, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const fs = require("fs");
const path = require("path");

// Load config
require('dotenv').config();
const REQUIRED_ENV_VARS = [ "DISCORD_TOKEN", "DISCORD_CLIENT_ID", "MONGO_URI" ];
let missingEnvVars = [];
for (const envVar of REQUIRED_ENV_VARS) {
	if (!process.env[envVar]) {
		missingEnvVars.push(envVar);
		console.warn(`Missing required environment variable: ${envVar}`);
	}
}

if (missingEnvVars > 0) {
	process.exit(-1);
}



// Instantiate all services
require("./services/steamUser");
require("./services/dbService");
require("./services/steamUtil");

client.commands = new Collection();

// Load commands
const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`Invalid command file: ${file}`);
  }
}

// Load events
fs.readdir("./events/", (err, files) => {
  files.forEach((file) => {
    const eventHandler = require(`./events/${file}`);
    const eventName = file.split(".")[0];
    client.on(eventName, (...args) => eventHandler(client, ...args));
  });
});

client.login(process.env.DISCORD_TOKEN);
