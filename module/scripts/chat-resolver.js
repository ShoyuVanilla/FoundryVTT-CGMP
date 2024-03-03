/*
 * Cautious Gamemasters Pack
 * https://github.com/cs96and/FoundryVTT-CGMP
 *
 * Copyright (c) 2020 Shoyu Vanilla - All Rights Reserved.
 * Copyright (c) 2021-2023 Alan Davies - All Rights Reserved.
 *
 * You may use, distribute and modify this code under the terms of the MIT license.
 *
 * You should have received a copy of the MIT license with this file. If not, please visit:
 * https://mit-license.org/
 */

import { CGMPSettings, CGMP_OPTIONS, CGMP_SPEAKER_MODE } from "./settings.js";

export class ChatResolver {

	static PATTERNS = {
		// extended commands
		"as": /^(\/as\s+)(\([^\)]+\)|\[[^\]]+\]|"[^"]+"|'[^']+'|[^\s]+)\s+([^]*)/i,
		// desc and ooc regexes contains an empty group so that the match layout is the same as "as"
		"desc": /^(\/desc\s+)()([^]*)/i,
		"ooc": /^(\/ooc\s+)()([^]*)/i
	};

	static DESCRIPTION_SPEAKER_ALIAS = '#CGMP_DESCRIPTION';

	static CHAT_MESSAGE_SUB_TYPES = {
		NONE: 0,
		DESC: 1,
		AS: 2,
		FORCED_OOC: 3
	};

	static onChatMessage(chatLog, message, chatData) {
		// Parse the message to determine the matching handler
		const [command, match] = ChatResolver._parseChatMessage(message);
	
		// Process message data based on the identified command type
		switch (command) {
			case "desc":
				if (!game.user.isGM && !CGMPSettings.getSetting(CGMP_OPTIONS.ALLOW_PLAYERS_TO_USE_DESC))
					return true;

				chatData.flags ??= {};
				chatData.flags.cgmp = { subType: ChatResolver.CHAT_MESSAGE_SUB_TYPES.DESC };
				chatData.type = CONST.CHAT_MESSAGE_TYPES.OTHER;
				chatData.speaker = { alias: ChatResolver.DESCRIPTION_SPEAKER_ALIAS, scene: game.user.viewedScene };
				chatData.content = match[3].replace(/\n/g, "<br>");
				
				ChatMessage.implementation.create(chatData, {});

				return false;

			case "as":
				if (!chatData.flags?.cgmp && !game.user.isGM)
					return true;

				// Remove quotes or brackets around the speaker's name.
				const alias = match[2].replace(/^["'\(\[](.*?)["'\)\]]$/, '$1');

				chatData.flags ??= {};
				chatData.flags.cgmp = { subType: ChatResolver.CHAT_MESSAGE_SUB_TYPES.AS };
				chatData.type = CONST.CHAT_MESSAGE_TYPES.IC;
				chatData.speaker = { alias, scene: game.user.viewedScene };
				chatData.content = match[3].replace(/\n/g, "<br>");

				ChatMessage.implementation.create(chatData, {});

				return false;

			case "ooc":
				chatData.flags ??= {};
				chatData.flags.cgmp = { subType: ChatResolver.CHAT_MESSAGE_SUB_TYPES.FORCED_OOC };
				return true;

			default:
				return true;
		}
	}

	static onPreCreateChatMessage(message) {
		switch (message.flags?.cgmp?.subType) {
			case ChatResolver.CHAT_MESSAGE_SUB_TYPES.AS:
			case ChatResolver.CHAT_MESSAGE_SUB_TYPES.DESC:
				break;

			default:
				ChatResolver._resolveHiddenToken(message);
				ChatResolver._resolvePCToken(message);
				break;
		}
	}

	static onRenderChatMessage(chatMessage, html, messageData) {
		switch (messageData.message.flags?.cgmp?.subType) {
			case ChatResolver.CHAT_MESSAGE_SUB_TYPES.AS:
				html.addClass('cgmp-as');
				return;

			case ChatResolver.CHAT_MESSAGE_SUB_TYPES.DESC:
				html.addClass('cgmp-desc');
				return;

			default:
				// Still handle the old way we identifed /desc messages, for older messages in the log.
				if (ChatResolver.DESCRIPTION_SPEAKER_ALIAS === messageData.message.speaker.alias)
					html.addClass('cgmp-desc');
				break;
		}
	}

	static _parseChatMessage(message) {
		// Iterate over patterns, finding the first match
		for ( let [command, rgx] of Object.entries(ChatResolver.PATTERNS) ) {
			const match = message.match(rgx); 
			if (match) return [command, match];
		}
		return [ undefined, undefined ];
	}

	static _convertToOoc(message) {
		// For all types of messages, change the speaker to the GM.
		// Convert in-character message to out-of-character, and remove the actor and token.
		const newType = ((CONST.CHAT_MESSAGE_TYPES.IC === message.type) ? CONST.CHAT_MESSAGE_TYPES.OOC : message.type);
		const newActor = ((CONST.CHAT_MESSAGE_TYPES.IC === message.type) ? null : message.speaker.actor);
		const newToken = ((CONST.CHAT_MESSAGE_TYPES.IC === message.type) ? null : message.speaker.token);

		const user = (message.user instanceof User ? message.user : game.users.get(message.user));

		message.updateSource({
			type: newType,
			speaker: {
				actor: newActor,
				alias: user.name,
				token: newToken
			}
		});
	}

	static _convertToInCharacter(message, onlyIfAlreadyInCharacter = false) {
		if (onlyIfAlreadyInCharacter && (ChatResolver.CHAT_MESSAGE_SUB_TYPES.FORCED_OOC === message.flags?.cgmp?.subType))
			return;

		const user = (message.user instanceof User ? message.user : game.users.get(message.user));
		const actor = user.character;
		const speaker = actor ? ChatMessage.getSpeaker({ actor }) : { actor: null, alias: user.name, token: null };

		// Convert out-of-character message to in-character (leave emotes and whispers as-is).
		let newType = message.type;
		switch (message.type) {
			case CONST.CHAT_MESSAGE_TYPES.EMOTE:
			case CONST.CHAT_MESSAGE_TYPES.WHISPER:
				break;

			default:
				// If no actor was found for the user, then leave type unchanged.
				if (actor)
					newType = CONST.CHAT_MESSAGE_TYPES.IC;
				break;
		}

		message.updateSource({ type: newType, speaker });
	}

	static _resolveHiddenToken(message) {
		if (!game.user.isGM) return;
		if (!CGMPSettings.getSetting(CGMP_OPTIONS.BLIND_HIDDEN_TOKENS)) return;

		const speaker = message.speaker;
		if (!speaker) return;

		const token = canvas.tokens.get(speaker.token);

		if (token?.document?.hidden) {
			if (CONST.CHAT_MESSAGE_TYPES.IC !== message.type) {
				// Whisper any non in-character messages.
				message.updateSource({
					whisper: ChatMessage.getWhisperRecipients("GM").map((user) => user.id)
				});
			} else {
				// Convert in-character messages to out-of-character.
				// We're assuming that the GM wanted to type something to the chat but forgot to deselect a token.
				this._convertToOoc(message);
			}
		}
	}

	static _resolvePCToken(message) {
		// Don't modify rolls or damage-log messages
		if ((message.rolls.length > 0) || message.flags?.damageLog || message.flags?.["damage-log"] || !message.speaker)
			return;

		// Pathfinder 1 attack rolls are hidden away in the flags for some reason.
		if (!foundry.utils.isEmpty(message.flags?.pf1?.metadata?.rolls ?? {}))
			return;

		const speakerMode = CGMPSettings.getSetting(game.user.isGM ? CGMP_OPTIONS.GM_SPEAKER_MODE : CGMP_OPTIONS.PLAYER_SPEAKER_MODE);

		switch (speakerMode) {
			case CGMP_SPEAKER_MODE.DISABLE_GM_AS_PC:
				if (game.user.isGM) {
					const token = canvas.tokens.get(message.speaker.token);
					if (token?.actor?.hasPlayerOwner) {
						this._convertToOoc(message);
					}
				}
				break;

			case CGMP_SPEAKER_MODE.FORCE_IN_CHARACTER:
				this._convertToInCharacter(message);
				break;

			case CGMP_SPEAKER_MODE.IN_CHARACTER_ALWAYS_ASSIGNED:
				this._convertToInCharacter(message, true);
				break;

			case CGMP_SPEAKER_MODE.ALWAYS_OOC:
				this._convertToOoc(message);
				break;
		}

		return;
	}
}
