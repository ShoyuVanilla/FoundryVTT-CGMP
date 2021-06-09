export const CGMP_OPTIONS = {
	DISABLE_GM_AS_PC: "disableGMAsPC",
	BLIND_HIDDEN_TOKENS: "blindHiddenTokens",
	DISABLE_CHAT_RECALL: "disableChatRecall",
	NOTIFY_TYPING: "notifyTyping"
}

export class CGMPSettings {
	static registerSettings() {
		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.DISABLE_GM_AS_PC, {
			name: "cgmp.disable-gm-as-pc-s",
			hint: "cgmp.disable-gm-as-pc-l",
			scope: "world",
			config: true,
			default: false,
			type: Boolean,
			onChange: disableGMAsPC => window.location.reload()
		});
		
		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.BLIND_HIDDEN_TOKENS, {
			name: "cgmp.blind-hidden-tokens-s",
			hint: "cgmp.blind-hidden-tokens-l",
			scope: "world",
			config: true,
			default: false,
			type: Boolean,
			onChange: blindHiddenTokens => window.location.reload()
		});
		
		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.DISABLE_CHAT_RECALL, {
			name: "cgmp.disable-chat-recall-s",
			hint: "cgmp.disable-chat-recall-l",
			scope: "world",
			config: true,
			default: false,
			type: Boolean,
			onChange: disableChatRecall => window.location.reload()
		});

		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.NOTIFY_TYPING, {
			name: "cgmp.notify-typing-s",
			hint: "cgmp.notify-typing-l",
			scope: "world",
			config: true,
			default: false,
			type: Boolean,
			onChange: notifyTyping => window.location.reload()
		});
	}

	static getSetting(option) {
		return game.settings.get("CautiousGamemastersPack", option);
	}
}