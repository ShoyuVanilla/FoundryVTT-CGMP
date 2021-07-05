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
		"as": new RegExp(/^(\/as\s+)(\([^\)]+\)|\[[^\]]+\]|"[^"]+"|'[^']+'|[^\s]+)\s+([^]*)/, 'i'),
		// desc regex contains an empty group so that the match layout is the same as "as"
		"desc": new RegExp(/^(\/desc\s+)()([^]*)/, 'i')
	};

	static DESCRIPTION_SPEAKER_ALIAS = '#CGMP_DESCRIPTION';

	static isV0_8() {
		return isNewerVersion(game.data.version, "0.7.9999");
	}

	static wrapFoundryMethods() {
		const _ChatLog_parse = function(wrapped, message) {
			if (game.user.isGM)
			{
				// Iterate over patterns, finding the first match
				let c, rgx, match;
				for ( [c, rgx] of Object.entries(ChatResolver.PATTERNS) ) {
					match = message.match(rgx); 
					if ( match ) return [c, match];
				}
			}
			return wrapped(message);
		};

		const _ChatLog_prototype_processMessage = async function(wrapped, message) {
			const cls = ChatResolver.isV0_8() ? ChatMessage.implementation : CONFIG.ChatMessage.entityClass;

			// Set up basic chat data
			const chatData = {
				user: game.user.id,
				speaker: cls.getSpeaker()
			};

			// Allow for handling of the entered message to be intercepted by a hook
			if ( Hooks.call("chatMessage", this, message, chatData) === false ) return;

			// Parse the message to determine the matching handler
			let [command, match] = this.constructor.parse(message);
		
			// Process message data based on the identified command type
			switch (command) {
				case "desc":
					match[2] = ChatResolver.DESCRIPTION_SPEAKER_ALIAS;
					// Fall through...

				case "as":
					const alias = match[2].replace(/^["'\(\[](.*?)["'\)\]]$/, '$1');
					chatData.type = CONST.CHAT_MESSAGE_TYPES.IC;
					chatData.speaker = {};
					chatData.speaker.alias = alias;
					chatData.speaker.scene = game.user.viewedScene;
					chatData.content = match[3].replace(/\n/g, "<br>");
					return cls.create(chatData, {});

				default:
					return wrapped(message);
			}
		};

		libWrapper.register('CautiousGamemastersPack', 'ChatLog.parse', _ChatLog_parse, 'MIXED');
		libWrapper.register('CautiousGamemastersPack', "ChatLog.prototype.processMessage", _ChatLog_prototype_processMessage, 'MIXED');
	}

	static _convertToGmSpeaker(messageData) {
		// For all types of messages, change the speaker to the GM.
		// Convert in-character message to out-of-character, and remove the actor and token.
		const newType = (CONST.CHAT_MESSAGE_TYPES.IC === messageData.type ? CONST.CHAT_MESSAGE_TYPES.OOC : messageData.type);
		const newActor = (CONST.CHAT_MESSAGE_TYPES.IC === messageData.type ? null : messageData.speaker.actor);
		const newToken = (CONST.CHAT_MESSAGE_TYPES.IC === messageData.type ? null : messageData.speaker.token);
		if (ChatResolver.isV0_8()) {
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
		const messageData = ChatResolver.isV0_8() ? message.data : message;
		const speaker = messageData.speaker;
		if (!speaker) return;
		const token = canvas.tokens.get(speaker.token);
		if (token?.data?.hidden) {
			if (CONST.CHAT_MESSAGE_TYPES.IC !== messageData.type)
			{
				// Whisper any non in-character messages.
				if (ChatResolver.isV0_8()) {
					messageData.update({
						whisper: ChatMessage.getWhisperRecipients("GM")
					});
				} else {
					messageData.whisper = ChatMessage.getWhisperRecipients("GM");
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
		const messageData = ChatResolver.isV0_8() ? message.data : message;
		const speaker = messageData.speaker;
		if (!speaker) return;
		const token = canvas.tokens.get(speaker.token);
		if (!messageData.roll && token?.actor?.hasPlayerOwner) {
			this._convertToGmSpeaker(messageData);
		}
	}

	static resolvePreCreateMessage(message) {
		ChatResolver._resolveHiddenToken(message);
		ChatResolver._resolvePCToken(message); 
	}

	static resolveRenderMessage(chatMessage, html, messageData) {
		if (messageData.message.speaker.alias === ChatResolver.DESCRIPTION_SPEAKER_ALIAS) {
			html[0].classList.add('desc');
		}
	}
}
