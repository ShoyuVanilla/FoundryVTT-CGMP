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

import { CGMPSettings, CGMP_OPTIONS, CGMP_SPEAKER_MODE } from "./settings.js";

export class ChatResolver {

	static PATTERNS = {
		// extended commands
		"as": /^(\/as\s+)(\([^\)]+\)|\[[^\]]+\]|"[^"]+"|'[^']+'|[^\s]+)\s+([^]*)/i,
		// desc regex contains an empty group so that the match layout is the same as "as"
		"desc": /^(\/desc\s+)()([^]*)/i
	};

	static DESCRIPTION_SPEAKER_ALIAS = '#CGMP_DESCRIPTION';

	static CHAT_MESSAGE_SUB_TYPES = {
		NONE: 0,
		DESC: 1,
		AS: 2
	};

	static onChatMessage(chatLog, message, chatData) {
		// Parse the message to determine the matching handler
		const [command, match] = ChatResolver._parseChatMessage(message);
	
		// Process message data based on the identified command type
		switch (command) {
			case "desc":
				if (!game.user.isGM && !CGMPSettings.getSetting(CGMP_OPTIONS.ALLOW_PLAYERS_TO_USE_DESC)) return true;

				match[2] = ChatResolver.DESCRIPTION_SPEAKER_ALIAS;
				chatData.flags ??= {};
				chatData.flags.cgmp = { subType: ChatResolver.CHAT_MESSAGE_SUB_TYPES.DESC };
				// Fall through...

			case "as":
				if (!chatData.flags?.cgmp && !game.user.isGM) return true;

				// Remove quotes or brackets around the speaker's name.
				const alias = match[2].replace(/^["'\(\[](.*?)["'\)\]]$/, '$1');

				chatData.flags ??= {};
				chatData.flags.cgmp ??= { subType: ChatResolver.CHAT_MESSAGE_SUB_TYPES.AS };
				chatData.type = CONST.CHAT_MESSAGE_TYPES.IC;
				chatData.speaker = { alias: alias, scene: game.user.viewedScene };
				chatData.content = match[3].replace(/\n/g, "<br>");

				ChatMessage.implementation.create(chatData, {});

				return false;

			default:
				return true;
		}
	}

	static onMessageBetterRolls(itemRoll, messageData) {
		if (!game.user.isGM) return;
		if (!CGMPSettings.getSetting(CGMP_OPTIONS.BLIND_HIDDEN_TOKENS)) return;

		const token = (messageData.speaker.token instanceof TokenDocument) ?
			messageData.speaker.token : canvas.tokens.get(messageData.speaker.token);

		if (token?.data?.hidden && (CONST.CHAT_MESSAGE_TYPES.ROLL === messageData.type))
			messageData.whisper ??= ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
	}

	static onPreCreateChatMessage(message) {
		switch (message.data.flags?.cgmp?.subType) {
			case ChatResolver.CHAT_MESSAGE_SUB_TYPES.AS:
			case ChatResolver.CHAT_MESSAGE_SUB_TYPES.DESC:
				break;

			default:
				ChatResolver._resolveHiddenToken(message.data);
				ChatResolver._resolvePCToken(message.data);
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

	static _convertToGmSpeaker(messageData) {
		// For all types of messages, change the speaker to the GM.
		// Convert in-character message to out-of-character, and remove the actor and token.
		const newType = (CONST.CHAT_MESSAGE_TYPES.IC === messageData.type ? CONST.CHAT_MESSAGE_TYPES.OOC : messageData.type);
		const newActor = (CONST.CHAT_MESSAGE_TYPES.IC === messageData.type ? null : messageData.speaker.actor);
		const newToken = (CONST.CHAT_MESSAGE_TYPES.IC === messageData.type ? null : messageData.speaker.token);

		messageData.update({
			type: newType,
			speaker: {
				actor: newActor,
				alias: game.users.get(messageData.user).name,
				token: newToken
			}
		});
	}

	static _convertToInCharacter(messageData) {
		const user = game.users.get(messageData.user);
		const actor = user.character;
		const speaker = actor ? ChatMessage.getSpeaker({ actor }) : { actor: null, alias: user.name, token: null };

		// Convert out-of-character message to in-character (leave emotes and whispers as-is).
		let newType = messageData.type;
		switch (messageData.type) {
			case CONST.CHAT_MESSAGE_TYPES.EMOTE:
			case CONST.CHAT_MESSAGE_TYPES.WHISPER:
				break;

			default:
				// If no actor was found for the user, then leave type unchanged.
				if (actor)
					newType = CONST.CHAT_MESSAGE_TYPES.IC;
				break;
		}

		messageData.update({ type: newType, speaker });
	}

	static _resolveHiddenToken(messageData) {
		if (!game.user.isGM) return;
		if (!CGMPSettings.getSetting(CGMP_OPTIONS.BLIND_HIDDEN_TOKENS)) return;

		const speaker = messageData.speaker;
		if (!speaker) return;

		const token = canvas.tokens.get(speaker.token);
		if (token?.data?.hidden) {
			if (CONST.CHAT_MESSAGE_TYPES.IC !== messageData.type) {
				// Whisper any non in-character messages.
				messageData.update({
					whisper: ChatMessage.getWhisperRecipients("GM").map((user) => user.id)
				});
			} else {
				// Convert in-character messages to out-of-character.
				// We're assuming that the GM wanted to type something to the chat but forgot to deselect a token.
				this._convertToGmSpeaker(messageData);
			}
		}
	}

	static _resolvePCToken(messageData) {
		if (messageData.roll || messageData.flags?.damageLog || messageData.flags?.["damage-log"] || !messageData.speaker)
			return;

		switch (CGMPSettings.getSetting(CGMP_OPTIONS.SPEAKER_MODE)) {
			case CGMP_SPEAKER_MODE.DISABLE_GM_AS_PC:
				if (game.user.isGM) {
					const token = canvas.tokens.get(messageData.speaker.token);
					if (token?.actor?.hasPlayerOwner) {
						this._convertToGmSpeaker(messageData);
					}
				}
				break;

			case CGMP_SPEAKER_MODE.GM_ALWAYS_OOC:
				if (game.user.isGM)
					this._convertToGmSpeaker(messageData);
				break;

			case CGMP_SPEAKER_MODE.FORCE_IN_CHARACTER_ASSIGNED:
				this._convertToInCharacter(messageData);
				break;
		}

		return;
	}
}
