const CGMP_CHAT_MESSAGE_TYPES = {
  DESCRIPTION: '#CGMP_DESCRIPTION'
}

class cautiousGMPack {
  static processExtendedChatCommands(messageData) {
    const asPattern = new RegExp(/^(\/as )(\((?:[^\)]+)\)|\[(?:[^\]]+)\]|(?:[^\s]+))\s+([^]*)/, 'i');
    const descPattern = new RegExp('^(\/desc )([^]*)', 'i');

    let asMatch = messageData.content.match(asPattern);
    if (asMatch) {
      let alias = asMatch[2].replace(/[\[\]]|[\(\)]/g, "");
      messageData.speaker = {};
      messageData.speaker.alias = alias;
      messageData.content = asMatch[3];
      messageData.type = CONST.CHAT_MESSAGE_TYPES.IC;
      return true;
    }

    let descMatch = messageData.content.match(descPattern);
    if (descMatch) {
      messageData.speaker = {};
      messageData.speaker.alias = CGMP_CHAT_MESSAGE_TYPES.DESCRIPTION;
      messageData.content = descMatch[2];
      messageData.type = CONST.CHAT_MESSAGE_TYPES.OOC;
      return true;
    }

    return false;
  }
}

Hooks.once("init", () => {
  game.settings.register("CautiousGamemastersPack", "disableGMAsPC", {
    name: "cgmp.disable-gm-as-pc-s",
    hint: "cgmp.disable-gm-as-pc-l",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: disableGMAsPC => window.location.reload()
  });

  game.settings.register("CautiousGamemastersPack", "whisperHiddenTokens", {
    name: "cgmp.whisper-hidden-tokens-s",
    hint: "cgmp.whisper-hidden-tokens-l",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: whisperHiddenTokens => window.location.reload()
  });

  game.settings.register("CautiousGamemastersPack", "disableChatRecall", {
    name: "cgmp.disable-chat-recall-s",
    hint: "cgmp.disable-chat-recall-l",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: disableChatRecall => window.location.reload()
  });
});

Hooks.on("preCreateChatMessage", messageData => {
  if (!game.user.isGM) return;
  const author = game.users.get(messageData.user);
  if (!author.isGM) return;

  if (cautiousGMPack.processExtendedChatCommands(messageData)) return;

  const speaker = messageData.speaker;
  if (!speaker) return;
  const token = canvas.tokens.get(speaker.token);

  // Check if token is hidden
  const whisperHiddenTokens = game.settings.get("CautiousGamemastersPack", "whisperHiddenTokens");
  if (whisperHiddenTokens && token && token.data.hidden) {
    messageData.whisper = ChatMessage.getWhisperRecipients("GM");
  }

  // Check if other user's token
  const disableGMAsPC = game.settings.get("CautiousGamemastersPack", "disableGMAsPC");
  if (disableGMAsPC && !messageData.roll && token && token.actor && token.actor.isPC) {
    messageData.speaker = {};
    messageData.speaker.alias = author.name;
    messageData.type = CONST.CHAT_MESSAGE_TYPES.OOC;
  }
});

// Disable arrow key recall
Hooks.once("init", () => {
  if (!game.settings.get("CautiousGamemastersPack", "disableChatRecall")) return;
  ChatLog.prototype._onChatKeyDownOrigin = ChatLog.prototype._onChatKeyDown;
  ChatLog.prototype._onChatKeyDown = new Function("event", 
    `const code = game.keyboard.getKey(event); ` +
    `if (["ArrowUp", "ArrowDown"].includes(code)) return; ` +
    `this._onChatKeyDownOrigin(event);`
  );
});

Hooks.on("renderChatMessage", (chatMessage, html, messageData) => {
  if (messageData.message.speaker.alias === CGMP_CHAT_MESSAGE_TYPES.DESCRIPTION) {
    html[0].className = html[0].className + 'desc'
  }
});
