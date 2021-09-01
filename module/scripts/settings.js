/*
 * Cautious Gamemasters Pack
 * https://github.com/cs96and/FoundryVTT-CGMP
 *
 * Copyright (c) 2020 Shoyu Vanilla - All Rights Reserved.
 * Copyright (c) 2021 Alan Davies - All Rights Reserved.
 *
 * You may use, distribute and modify this code under the terms of the MIT license.
 *
 * You should have received a copy of the MIT license with this file. If not, please visit:
 * https://mit-license.org/
 */

export const CGMP_OPTIONS = {
	BLIND_HIDDEN_TOKENS: "blindHiddenTokens",
	DISABLE_CHAT_RECALL: "disableChatRecall",
	DISABLE_GM_AS_PC: "disableGMAsPC",
	FORCE_IN_CHARACTER_ASSIGNED: "forceInCharacterAssigned",
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

		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.FORCE_IN_CHARACTER_ASSIGNED, {
			name: "cgmp.force-in-character-assigned-s",
			hint: "cgmp.force-in-character-assigned-l",
			scope: "world",
			config: true,
			default: false,
			type: Boolean,
			onChange: forceInCharacterAssigned => window.location.reload()
		});
	}

	static getSetting(option) {
		return game.settings.get("CautiousGamemastersPack", option);
	}
}
