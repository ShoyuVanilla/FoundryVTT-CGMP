/*
 * Cautious Gamemasters Pack
 * https://github.com/cs96and/FoundryVTT-CGMP
 *
 * Copyright (c) 2020 Shoyu Vanilla - All Rights Reserved.
 * Copyright (c) 2021-2022 Alan Davies - All Rights Reserved.
 *
 * You may use, distribute and modify this code under the terms of the MIT license.
 *
 * You should have received a copy of the MIT license with this file. If not, please visit:
 * https://mit-license.org/
 */

export const CGMP_OPTIONS = {
	ALLOW_PLAYERS_TO_USE_DESC: "allowPlayersToUseDesc",
	BLIND_HIDDEN_TOKENS: "blindHiddenTokens",
	NOTIFY_TYPING: "notifyTyping",
	GM_SPEAKER_MODE: "gmSpeakerMode",
	PLAYER_SPEAKER_MODE: "playerSpeakerMode"
};

const CGMP_LEGACY_OPTIONS = {
	DISABLE_GM_AS_PC: "disableGMAsPC",
	SPEAKER_MODE: "speakerMode"
};

export const CGMP_SPEAKER_MODE = {
	DEFAULT: 0,
	DISABLE_GM_AS_PC: 1,
	FORCE_IN_CHARACTER: 2,
	ALWAYS_OOC: 3
};

export class CGMPSettings {
	static registerSettings() {
		const gmSpeakerModeChoices = {
			[CGMP_SPEAKER_MODE.DEFAULT]: game.i18n.localize("cgmp.speaker-mode.default-s"),
			[CGMP_SPEAKER_MODE.DISABLE_GM_AS_PC]: game.i18n.localize("cgmp.speaker-mode.disable-gm-as-pc-s"),
			[CGMP_SPEAKER_MODE.FORCE_IN_CHARACTER]: game.i18n.localize("cgmp.speaker-mode.force-in-character-s"),
			[CGMP_SPEAKER_MODE.ALWAYS_OOC]: game.i18n.localize("cgmp.speaker-mode.always-ooc-s")
		};

		const playerSpeakerModeChoices = deepClone(gmSpeakerModeChoices);
		delete playerSpeakerModeChoices[CGMP_SPEAKER_MODE.DISABLE_GM_AS_PC];

		// Legacy settings, no longer accessible via UI.
		// Left here so they can be read and converted to the new Speaker Modes on startup.
		game.settings.register("CautiousGamemastersPack", CGMP_LEGACY_OPTIONS.DISABLE_GM_AS_PC, {
			scope: "world",
			config: false,
			default: false,
			type: Boolean
		});

		game.settings.register("CautiousGamemastersPack", CGMP_LEGACY_OPTIONS.SPEAKER_MODE, {
			scope: "world",
			config: false,
			default: (CGMPSettings.getSetting(CGMP_LEGACY_OPTIONS.DISABLE_GM_AS_PC) ? CGMP_SPEAKER_MODE.DISABLE_GM_AS_PC : CGMP_SPEAKER_MODE.DEFAULT),
			type: Number,
			choices: gmSpeakerModeChoices
		});

		// Active settings...

		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.GM_SPEAKER_MODE, {
			name: "cgmp.gm-speaker-mode-s",
			hint: "cgmp.gm-speaker-mode-l",
			scope: "world",
			config: true,
			default: CGMPSettings.convertGmSpeakerModeLegacySetting(),
			type: Number,
			choices: gmSpeakerModeChoices
		});

		game.settings.register("CautiousGamemastersPack", CGMP_OPTIONS.PLAYER_SPEAKER_MODE, {
			name: "cgmp.player-speaker-mode-s",
			scope: "world",
			config: true,
			default: CGMPSettings.convertPlayerSpeakerModeLegacySetting(),
			type: Number,
			choices: playerSpeakerModeChoices
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

	static convertGmSpeakerModeLegacySetting() {
		const legacySpeakerMode = CGMPSettings.getSetting(CGMP_LEGACY_OPTIONS.SPEAKER_MODE);
		return legacySpeakerMode ?? (CGMPSettings.getSetting(CGMP_LEGACY_OPTIONS.DISABLE_GM_AS_PC) ? CGMP_SPEAKER_MODE.DISABLE_GM_AS_PC : CGMP_SPEAKER_MODE.DEFAULT);
	}

	static convertPlayerSpeakerModeLegacySetting() {
		return ((CGMP_SPEAKER_MODE.FORCE_IN_CHARACTER === CGMPSettings.getSetting(CGMP_LEGACY_OPTIONS.SPEAKER_MODE)) ?
			CGMP_SPEAKER_MODE.FORCE_IN_CHARACTER : CGMP_SPEAKER_MODE.DEFAULT);
	}

	static getSetting(option) {
		return game.settings.get("CautiousGamemastersPack", option);
	}
}
