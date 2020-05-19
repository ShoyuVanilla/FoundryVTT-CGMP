Hooks.once("init", () => {
  game.settings.register("CGMP", "disableGMAsPC", {
    name: "cgmp.disable-gm-as-pc-s",
    hint: "cgmp.disable-gm-as-pc-l",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("CGMP", "whisperHiddenTokens", {
    name: "cgmp.whisper-hidden-tokens-s",
    hint: "cgmp.whisper-hidden-tokens-l",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("CGMP", "disableChatRecall", {
    name: "cgmp.disable-chat-recall-s",
    hint: "cgmp.disable-chat-recall-l",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
});

Hooks.on("preCreateChatMessage", messageData => {
  if (!game.user.isGM) return;

  const author = game.users.get(messageData.user);
  const speaker = messageData.speaker;
  if (!author.isGM || !speaker) return;
  const token = canvas.tokens.get(speaker.token);

  // Check if token is hidden
  const whisperHiddenTokens = game.settings.get("CGMP", "whisperHiddenTokens");
  if (whisperHiddenTokens && token && token.data.hidden) {
    messageData.whisper = ChatMessage.getWhisperRecipients("GM");
  }

  // Check if other user's token
  const disableGMAsPC = game.settings.get("CGMP", "disableGMAsPC");
  if (disableGMAsPC && !messageData.roll && token && token.actor && token.actor.isPC) {
    messageData.speaker = {};
    messageData.speaker.alias = author.name;
    messageData.type = CONST.CHAT_MESSAGE_TYPES.OOC;
  }
});

// Disable arrow key recall
Hooks.once("ready", () => {
  if (!game.settings.get("CGMP", "disableChatRecall")) return;
  ui.chat._onChatKeyDownOrigin = ui.chat._onChatKeyDown;
  ui.chat._onChatKeyDown = (event) => {
    const code = game.keyboard.getKey(event);
    if (["ArrowUp", "ArrowDown"].includes(code)) {
      return;
    }
    ui.chat._onChatKeyDownOrigin(event);
  }
});
