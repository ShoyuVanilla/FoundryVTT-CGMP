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

import { CGMPSettings, CGMP_OPTIONS } from "./settings.js";
import { TypingNotifier } from "./typing-notifier.js";
import { ChatResolver } from "./chat-resolver.js";

Hooks.once('init', () => {
	CGMPSettings.registerSettings();
	game.cgmp = {};

	if (CGMPSettings.getSetting(CGMP_OPTIONS.NOTIFY_TYPING))
		game.cgmp.typingNotifier = new TypingNotifier();

	Hooks.on('chatMessage', ChatResolver.onChatMessage);
	Hooks.on('messageBetterRolls', ChatResolver.onMessageBetterRolls);
	Hooks.on('preCreateChatMessage', ChatResolver.onPreCreateChatMessage);
	Hooks.on('renderChatMessage', ChatResolver.onRenderChatMessage);
});

Hooks.once('ready', () => {
	if(!game.modules.get('lib-wrapper')?.active && game.user.isGM)
		ui.notifications.error("Cautious GameMaster's Pack requires the 'libWrapper' module. Please install and activate it.");
});

