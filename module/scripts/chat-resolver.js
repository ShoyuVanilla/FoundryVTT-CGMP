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
		let [command, match] = ChatResolver._parseChatMessage(message);
	
		// Process message data based on the identified command type
		switch (command) {
			case "desc":
				match[2] = ChatResolver.DESCRIPTION_SPEAKER_ALIAS;
				chatData.flags ??= {};
				chatData.flags.cgmp = { subType: ChatResolver.CHAT_MESSAGE_SUB_TYPES.DESC };
				// Fall through...

			case "as":
				// Remove quotes or brackets around the speaker's name.
				const alias = match[2].replace(/^["'\(\[](.*?)["'\)\]]$/, '$1');

				chatData.flags ??= {};
				chatData.flags.cgmp ??= { subType: ChatResolver.CHAT_MESSAGE_SUB_TYPES.AS };
				chatData.type = CONST.CHAT_MESSAGE_TYPES.IC;
				chatData.speaker = { alias: alias, scene: game.user.viewedScene };
				chatData.content = match[3].replace(/\n/g, "<br>");

				const cls = ChatResolver._isV0_8() ? ChatMessage.implementation : CONFIG.ChatMessage.entityClass;
				cls.create(chatData, {});

				return false;

			default:
				return true;
		}
	}

	static onMessageBetterRolls(itemRoll, messageData) {
		if (!game.user.isGM) return;

		const token = (messageData.speaker.token instanceof (ChatResolver._isV0_8() ? TokenDocument : Token)) ?
			messageData.speaker.token : canvas.tokens.get(messageData.speaker.token);

		if (token?.data?.hidden && (CONST.CHAT_MESSAGE_TYPES.ROLL === messageData.type))
			messageData.whisper ??= ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
	}

	static onPreCreateChatMessage(message) {
		ChatResolver._resolveHiddenToken(message);
		ChatResolver._resolvePCToken(message); 
	}

	static onRenderChatMessage(chatMessage, html, messageData) {
		switch (messageData.message.flags?.cgmp?.subType)
		{
			case ChatResolver.CHAT_MESSAGE_SUB_TYPES.AS:
				html[0].classList.add('as');
				return;

			case ChatResolver.CHAT_MESSAGE_SUB_TYPES.DESC:
				html[0].classList.add('desc');
				return;

			default:
				// Still handle the old way we identifed /desc messages, for older messages in the log.
				if (ChatResolver.DESCRIPTION_SPEAKER_ALIAS === messageData.message.speaker.alias)
					html[0].classList.add('desc');
				break;
		}
	}

	static _isV0_8() {
		return !isNewerVersion("0.8.0", game.data.version);
	}

	static _parseChatMessage(message) {
		if (game.user.isGM)
		{
			// Iterate over patterns, finding the first match
			for ( let [command, rgx] of Object.entries(ChatResolver.PATTERNS) ) {
				const match = message.match(rgx); 
				if (match) return [command, match];
			}
		}
		return [ undefined, undefined ];
	}

	static _convertToGmSpeaker(messageData) {
		// For all types of messages, change the speaker to the GM.
		// Convert in-character message to out-of-character, and remove the actor and token.
		const newType = (CONST.CHAT_MESSAGE_TYPES.IC === messageData.type ? CONST.CHAT_MESSAGE_TYPES.OOC : messageData.type);
		const newActor = (CONST.CHAT_MESSAGE_TYPES.IC === messageData.type ? null : messageData.speaker.actor);
		const newToken = (CONST.CHAT_MESSAGE_TYPES.IC === messageData.type ? null : messageData.speaker.token);
		if (ChatResolver._isV0_8()) {
			messageData.update({
				type: newType,
				speaker: {
					actor: newActor,
					alias: game.users.get(messageData.user).name,
					token: newToken
				}
			});
		} else {
			messageData.type = newType;
			messageData.speaker.actor = newActor;
			messageData.speaker.alias = game.users.get(messageData.user).name;
			messageData.speaker.token = newToken;
		}
	}

	static _resolveHiddenToken(message) {
		if (!game.user.isGM) return;
		if (!CGMPSettings.getSetting(CGMP_OPTIONS.BLIND_HIDDEN_TOKENS)) return;
		const messageData = ChatResolver._isV0_8() ? message.data : message;
		const speaker = messageData.speaker;
		if (!speaker) return;
		const token = canvas.tokens.get(speaker.token);
		if (token?.data?.hidden) {
			if (CONST.CHAT_MESSAGE_TYPES.IC !== messageData.type)
			{
				// Whisper any non in-character messages.
				if (ChatResolver._isV0_8()) {
					messageData.update({
						whisper: ChatMessage.getWhisperRecipients("GM").map((user) => user.id)
					});
				} else {
					messageData.whisper = ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
				}
			}
			else
			{
				// Convert in-character messages to out-of-character.
				// We're assuming that the GM wanted to type something to the chat but forgot to deselect a token.
				this._convertToGmSpeaker(messageData);
			}
		}
	}

	static _resolvePCToken(message) {
		if (!game.user.isGM) return;
		if (!CGMPSettings.getSetting(CGMP_OPTIONS.DISABLE_GM_AS_PC)) return;

		const messageData = ChatResolver._isV0_8() ? message.data : message;

		if (messageData.roll || (messageData.flags && (messageData.flags.damageLog || messageData.flags["damage-log"])) || !messageData.speaker)
			return;

		const token = canvas.tokens.get(messageData.speaker.token);
		if (token?.actor?.hasPlayerOwner)
			this._convertToGmSpeaker(messageData);
	}
}
