import { CGMPSettings, CGMP_OPTIONS } from "./settings.js";
import { TypingNotifier } from "./typing-notifier.js";
import { ChatResolver } from "./chat-resolver.js";

Hooks.once('init', () => {
	CGMPSettings.registerSettings();
	game.cgmp = {};

	let patchFuncStr = '';

	if (CGMPSettings.getSetting(CGMP_OPTIONS.NOTIFY_TYPING)) {
		Hooks.once('renderChatLog', _ => game.cgmp.typingNotifier = new TypingNotifier());
		patchFuncStr += "if (game.cgmp.typingNotifier) game.cgmp.typingNotifier.onChatKeyDown(event);"
	}

	if (CGMPSettings.getSetting(CGMP_OPTIONS.DISABLE_CHAT_RECALL)) {
		patchFuncStr += 'const code = game.keyboard.getKey(event);' +
			'if (["ArrowUp", "ArrowDown"].includes(code)) return;';
	}

	if (patchFuncStr != '') {
		patchFuncStr += 'this._onChatKeyDownOrigin(event);';
		ChatLog.prototype._onChatKeyDownOrigin = ChatLog.prototype._onChatKeyDown;
		ChatLog.prototype._onChatKeyDown = new Function("event", patchFuncStr);
	}
});

Hooks.on('preCreateChatMessage', ChatResolver.resolvePreCreateMessage);
Hooks.on('renderChatMessage', ChatResolver.resolveRenderMessage);
ChatResolver.monkeyPatchFoundryMethods();
