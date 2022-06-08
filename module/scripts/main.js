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

import { CGMPSettings, CGMP_OPTIONS } from "./settings.js";
import { TypingNotifier } from "./typing-notifier.js";
import { ChatResolver } from "./chat-resolver.js";

Hooks.once('setup', () => {
	CGMPSettings.registerSettings();
	game.cgmp = {};

	if (CGMPSettings.getSetting(CGMP_OPTIONS.NOTIFY_TYPING))
		game.cgmp.typingNotifier = new TypingNotifier(CGMPSettings.getSetting(CGMP_OPTIONS.ALLOW_PLAYERS_TO_SEE_TYPING_NOTIFICATION));

	Hooks.on('chatMessage', ChatResolver.onChatMessage);
	Hooks.on('messageBetterRolls', ChatResolver.onMessageBetterRolls);
	Hooks.on('preCreateChatMessage', ChatResolver.onPreCreateChatMessage);
	Hooks.on('renderChatMessage', ChatResolver.onRenderChatMessage);

	const hideNpcDamage = CGMPSettings.getSetting(CGMP_OPTIONS.HIDE_NPC_DAMAGE_TEXT);
	const hideNpcHealing = CGMPSettings.getSetting(CGMP_OPTIONS.HIDE_NPC_HEALING_TEXT);

	if (game.modules.get('lib-wrapper')?.active && (hideNpcDamage || hideNpcHealing)) {
		const regex = new RegExp(`^[${hideNpcDamage ? "-" : ""}${hideNpcHealing ? "+" : ""}]\\d+$`);

		libWrapper.register('CautiousGamemastersPack', 'ObjectHUD.prototype.createScrollingText',
			async function(wrapper, content, ...args) {
				// "this" is an ObjectHUD here...
				if (!this.object instanceof Token || this.object.actor.hasPlayerOwner || !regex.test(content))
					wrapper(content, ...args);
			},
			'MIXED'
		);
	}
});

Hooks.once('ready', () => {
	if(!game.modules.get('lib-wrapper')?.active && game.user.isGM)
		ui.notifications.error("Cautious GameMaster's Pack requires the 'libWrapper' module. Please install and activate it.", { permanent: true });
});

