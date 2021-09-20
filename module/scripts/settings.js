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
	ALLOW_PLAYERS_TO_USE_DESC: "allowPlayersToUseDesc",
	BLIND_HIDDEN_TOKENS: "blindHiddenTokens",
	DISABLE_CHAT_RECALL: "disableChatRecall",
	NOTIFY_TYPING: "notifyTyping",
	SPEAKER_MODE: "speakerMode"
};

const CGMP_LEGACY_OPTIONS = {
	DISABLE_GM_AS_PC: "disableGMAsPC"
};

export const CGMP_SPEAKER_MODE = {
	NONE: 0,
	DISABLE_GM_AS_PC: 1,
	FORCE_IN_CHARACTER_ASSIGNED: 2,
	GM_ALWAYS_OOC: 3
};

export class CGMPSettings {
	static registerSettings() {

		// Legacy setting, no longer accessible via UI.
		// Left here so it can be read and converted to the new Speaker Mode on startup.
		game.settings.register("CautiousGamemastersPack", CGMP_LEGACY_OPTIONS.DISABLE_GM_AS_PC, {
			scope: "world",
			config: false,
			default: false,
			type: Boolean
		});

		const speakerModeChoices = {};
		speakerModeChoices[CGMP_SPEAKER_MODE.NONE] = game.i18n.localize("cgmp.speaker-mode.none-s");
		speakerModeChoices[CGMP_SPEAKER_MODE.DISABLE_GM_AS_PC] = game.i18n.localize("cgmp.speaker-mode.disable-gm-as-pc-s");
		speakerModeChoices[CGMP_SPEAKER_MODE.FORCE_IN_CHARACTER_ASSIGNED] = game.i18n.localize("cgmp.speaker-mode.force-in-character-assigned-s");
		speakerModeChoices[CGMP_SPEAKER_MODE.GM_ALWAYS_OOC] = game.i18n.localize("cgmp.speaker-mode.gm-always-ooc-s");

		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.SPEAKER_MODE, {
			name: "cgmp.speaker-mode-s",
			hint: "cgmp.speaker-mode-l",
			scope: "world",
			config: true,
			default: (CGMPSettings.getSetting(CGMP_LEGACY_OPTIONS.DISABLE_GM_AS_PC) ? CGMP_SPEAKER_MODE.DISABLE_GM_AS_PC : CGMP_SPEAKER_MODE.NONE),
			type: Number,
			choices: speakerModeChoices
		});

		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.ALLOW_PLAYERS_TO_USE_DESC, {
			name: "cgmp.allow-players-to-use-desc-s",
			hint: "cgmp.allow-players-to-use-desc-l",
			scope: "world",
			config: true,
			default: false,
			type: Boolean
		});

		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.BLIND_HIDDEN_TOKENS, {
			name: "cgmp.blind-hidden-tokens-s",
			hint: "cgmp.blind-hidden-tokens-l",
			scope: "world",
			config: true,
			default: false,
			type: Boolean
		});
		
		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.DISABLE_CHAT_RECALL, {
			name: "cgmp.disable-chat-recall-s",
			hint: "cgmp.disable-chat-recall-l",
			scope: "world",
			config: true,
			default: false,
			type: Boolean,
			onChange: () => window.location.reload()
		});

		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.NOTIFY_TYPING, {
			name: "cgmp.notify-typing-s",
			hint: "cgmp.notify-typing-l",
			scope: "world",
			config: true,
			default: false,
			type: Boolean,
			onChange: () => window.location.reload()
		});
	}

	static getSetting(option) {
		return game.settings.get("CautiousGamemastersPack", option);
	}
}
