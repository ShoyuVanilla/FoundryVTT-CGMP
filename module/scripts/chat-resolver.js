import { CGMPSettings, CGMP_OPTIONS } from "./settings.js";

export class ChatResolver {

	static PATTERNS = {
		// extended commands
		"as": new RegExp(/^(\/as\s+)(\([^\)]+\)|\[[^\]]+\]|"[^"]+"|'[^']+'|[^\s]+)\s+([^]*)/, 'i'),
		// desc regex contains an empty group so that the match layout is the same as "as"
		"desc": new RegExp(/^(\/desc\s+)()([^]*)/, 'i')
	};

	static DESCRIPTION_SPEAKER_ALIAS = '#CGMP_DESCRIPTION';

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
			const cls = ChatMessage.implementation;

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

		libWrapper.register('cautious-gamemasters-pack-2', 'ChatLog.parse', _ChatLog_parse, 'MIXED');
		libWrapper.register('cautious-gamemasters-pack-2', "ChatLog.prototype.processMessage", _ChatLog_prototype_processMessage, 'MIXED');
	}

	static _resolveHiddenToken(message) {
		if (!game.user.isGM) return;
		if (!CGMPSettings.getSetting(CGMP_OPTIONS.BLIND_HIDDEN_TOKENS)) return;
		const speaker = message.data.speaker;
		if (!speaker) return;
		const token = canvas.tokens.get(speaker.token);
		if (token?.data?.hidden) {
			if (CONST.CHAT_MESSAGE_TYPES.IC !== message.data.type)
			{
				// Whisper any non in-character messages.
				message.data.update({
					whisper : ChatMessage.getWhisperRecipients("GM")
				});
			}
			else
			{
				// Convert in-character messages to out-of-character.
				// We're assuming that the GM wanted to type something to the chat but forgot to deselect a token.
				message.data.update({
					type: CONST.CHAT_MESSAGE_TYPES.OOC,
					speaker: {
						actor: null,
						alias: game.users.get(message.data.user).name,
						token: null
					},
				});
			}
		}
	}

	static _resolvePCToken(message) {
		if (!game.user.isGM) return;
		if (!CGMPSettings.getSetting(CGMP_OPTIONS.DISABLE_GM_AS_PC)) return;
		const speaker = message.data.speaker;
		if (!speaker) return;
		const token = canvas.tokens.get(speaker.token);
		if (!message.data.roll && token?.actor?.hasPlayerOwner) {
			message.data.update({
				speaker: {
					actor: null,
					alias: game.users.get(message.data.user).name,
					token: null
				},
				type: CONST.CHAT_MESSAGE_TYPES.OOC
			});
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
