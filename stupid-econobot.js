
const Discord = require('discord.js');
const bot = new Discord.Client();
const Utils = require('./utils');
var token = require('./token');
const moment = require('moment');

var guild = null;

var globalConst = require('./models/constants');
var youtube = require('./models/youtube');
var utip = require('./models/utip');
globalConst.init();
youtube.init();
utip.init();

Utils.setConfig(globalConst);
var configCommands = require('./commandes/config');
var youtubeCommands = require('./commandes/youtube');
var utipCommands = require('./commandes/utip');

var commands = {
  config: configCommands,
  youtube: youtubeCommands,
  utip: utipCommands
}
try {
  bot.on('ready', function () {
    Utils.log(Utils.Color.FgGreen + 'bot started');
    bot.user.setActivity('je suis un bot');
  });
} catch (e) {
  Utils.log(e.stack, true);
}

var runCommand = (args, message) => {
  if (args[0] === globalConst.prefix + 'help') {
    Utils.log(`running ${Utils.Color.FgYellow}help ${Utils.Color.Reset}command`);
    if (args.length > 1) {
      if (commands[args[1]] && message.member.hasPermission(commands[args[1]].role)) {
        commands[args[1]].help(message);
        return;
      }
      Utils.reply(message, `Aucune commande du nom de **${args[1]}**.`, true)
      return;
    }
    var keys = Object.keys(commands);
    var fields = [];
    keys.forEach((command) => {
      if (message.member.hasPermission(commands[command].role)) {
        fields.push({
          text: commands[command].helpCat,
          title: command,
          grid: false
        });
      }
    });
    Utils.sendEmbed(message, 0x00AFFF, 'Liste des commandes', "Pour plus d'info sur une commandes faites **" + globalConst.prefix + "help [commande]**", message.author, fields);
    return;
  }
  args[0] = args[0].replace(globalConst.prefix, '');
  if (commands[args[0]]) {
    var label = args[0];
    Utils.log(`running ${Utils.Color.FgYellow}${label} ${Utils.Color.Reset}command`);
    args.shift();
    commands[label].runCommand(args, message);
    return;
  }
}

bot.on('message', function (message) {
  try {
    if(message.author.bot || message.channel.type == "dm") {
      return;
    }
    if (message.content.substring(0, globalConst.prefix.length) === globalConst.prefix) {
      var args = message.content.split(" ");
      Utils.log('Command detected', false, message.channel.name, message.author.username, message.content);
      Utils.log(`fetching for ${Utils.Color.FgYellow}${message.author.username}${Utils.Color.Reset}`);
      message.channel.guild.fetchMember(message.author.id).then(member => {
        message.member = member
        runCommand(args, message);
      }).catch((e) => {
        Utils.log(e.stack, true);
      });
    } else if( /(^| )utip($|[^a-zA-Z])/gi.test(message.content) ) {
      var percent = Math.round(100 * utip.found / utip.goal);
      Utils.log('Magik command utip detected', false, message.channel.name, message.author.username, message.content)
      if (!utip.cooldown) {
        Utils.sendUtipMessage(utip, percent, message.channel.id);
        return;
      } 
      if (!utip.lastUsed) {
        Utils.sendUtipMessage(utip, percent, message.channel.id);
        utip.lastUsed = moment();
        return;
      }
      var diff = moment(utip.lastUsed).add(utip.cooldown, 'seconds').diff(moment());
      if(diff <= 0) {
        Utils.sendUtipMessage(utip, percent, message.channel.id);
        utip.lastUsed = moment();
        return;
      }
    }
  } catch (e) {
    Utils.log(e.stack, true);
  }
});

try {
  bot.login(token).then(() => {
    guild = bot.guilds.first()
    Utils.setGuild(guild);
  }).catch((e) => {
    Utils.log(e, true);
  })
  bot.on('error', (err) => {
    Utils.log(err.stack, true);
  });
} catch (err) {
  Utils.log(err.stack, true);
}

try {
  var youtubeRequest = require('./intervals/youtube');

  setInterval(() => {
    youtubeRequest(guild);
  }, 1000);
} catch (err) {
  Utils.log(err.stack, true);
}
try {
  var utipRequest = require('./intervals/utip');
  setInterval(() => {
    utipRequest(guild);
  }, 5000);
} catch (err) {
  Utils.log(err.stack, true);
}

var isYoutube = false;

setInterval(() => {
  if (isYoutube) {
    bot.user.setActivity(Utils.spacer(Number(utip.found)) + "€ sur uTip ce mois-ci");
  } else {
    bot.user.setActivity(Utils.spacer(Number(youtube.lastNbSubscribers)) + " abonnés youtube");
  }
  isYoutube = !isYoutube;

}, 15 * 1000)
