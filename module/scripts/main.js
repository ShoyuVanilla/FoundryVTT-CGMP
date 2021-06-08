import { CGMPSettings, CGMP_OPTIONS } from "./settings.js";
import { TypingNotifier } from "./typing-notifier.js";
import { ChatResolver } from "./chat-resolver.js";

Hooks.once('init', () => {
	CGMPSettings.registerSettings();
	game.cgmp = {};

	let shouldWrapOnChatKeyDown = false;
	if (CGMPSettings.getSetting(CGMP_OPTIONS.NOTIFY_TYPING)) {
		Hooks.once('renderChatLog', _ => game.cgmp.typingNotifier = new TypingNotifier());
		shouldWrapOnChatKeyDown = true;
	}

	game.cgmp.disableChatRecall = CGMPSettings.getSetting(CGMP_OPTIONS.DISABLE_CHAT_RECALL);
	shouldWrapOnChatKeyDown |= game.cgmp.disableChatRecall;

	if (shouldWrapOnChatKeyDown)
	{
		const _ChatLog_prototype_onChatKeyDown = function(wrapped, event) {
			if (game.cgmp.typingNotifier)
				game.cgmp.typingNotifier.onChatKeyDown(event);

			if (game.cgmp.disableChatRecall) {
				const code = game.keyboard.getKey(event);
				if (["ArrowUp", "ArrowDown"].includes(code))
					return;
			}

			wrapped(event);
		};

		libWrapper.register('CautiousGamemastersPack2', 'ChatLog.prototype._onChatKeyDown', _ChatLog_prototype_onChatKeyDown, 'MIXED');
	}

	Hooks.on('preCreateChatMessage', ChatResolver.resolvePreCreateMessage);
	Hooks.on('renderChatMessage', ChatResolver.resolveRenderMessage);
	ChatResolver.wrapFoundryMethods();
});

Hooks.once('ready', () => {
	if(!game.modules.get('lib-wrapper')?.active && game.user.isGM)
		ui.notifications.error("Cautious GameMaster's Pack 2 requires the 'libWrapper' module. Please install and activate it.");
});

