const channelName = "dandmwg"; // Replace with your Twitch username (lowercase)
const chatContainer = document.getElementById("chat");

const client = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

client.onopen = () => {
  client.send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership");
  client.send("PASS oauth:anonymous");
  client.send("NICK justinfan12345");
  client.send(`JOIN #${channelName}`);
};

client.onmessage = (event) => {
  const messages = event.data.trim().split("\r\n");

  messages.forEach((line) => {
    if (line.startsWith("PING")) {
      client.send("PONG :tmi.twitch.tv");
      return;
    }

    const match = line.match(/^@(.+?) :\w+!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)/);
    if (match) {
      const rawTags = match[1];
      const message = match[2];
      const tags = parseTags(rawTags);
      const username = tags["display-name"] || "user";
      const color = tags["color"] || "#fff";
      const badges = parseBadges(tags["badges"]);
      const emotes = tags["emotes"];
      const parsedMessage = parseEmotes(message, emotes);

      addMessage(username, color, badges, parsedMessage);
    }
  });
};

function addMessage(user, color, badges, message) {
  const bubble = document.createElement("div");
  bubble.className = "message";

  const avatar = `<img src="https://decapi.me/twitch/avatar/${user}" class="avatar">`;
  bubble.innerHTML = `${avatar}<span class="badges">${badges.map(getBadgeHTML).join("")}</span><span class="username" style="color: ${color}">${user}:</span> <span class="text">${message}</span>`;

  chatContainer.appendChild(bubble);

  setTimeout(() => {
    bubble.style.opacity = 0;
    setTimeout(() => bubble.remove(), 1000);
  }, 30000);

  if (chatContainer.children.length > 30) {
    chatContainer.removeChild(chatContainer.firstChild);
  }
}

function parseTags(tagStr) {
  return Object.fromEntries(tagStr.split(";").map(t => t.split("=")));
}

function parseBadges(badgeStr) {
  if (!badgeStr) return [];
  return badgeStr.split(",").map(b => b.split("/")[0]);
}

function getBadgeHTML(type) {
  const emojis = {
    mod: "🛡️",
    subscriber: "⭐",
    vip: "💎",
    broadcaster: "📣",
    premium: "💰"
  };
  return `<span class="badge" title="${type}">${emojis[type] || "🎖️"}</span>`;
}

function parseEmotes(message, emoteTag) {
  if (!emoteTag) return sanitize(message);

  const parts = [];
  const emoteMap = {};

  emoteTag.split("/").forEach(emote => {
    const [id, positions] = emote.split(":");
    positions.split(",").forEach(range => {
      const [start, end] = range.split("-").map(Number);
      emoteMap[start] = { end, id };
    });
  });

  let i = 0;
  while (i < message.length) {
    if (emoteMap[i]) {
      const { end, id } = emoteMap[i];
      const emoteCode = message.slice(i, end + 1);
      parts.push(`<img src="https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0" alt="${emoteCode}" class="emote">`);
      i = end + 1;
    } else {
      parts.push(sanitize(message[i]));
      i++;
    }
  }

  return parts.join("");
}

function sanitize(str) {
  return str.replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}
