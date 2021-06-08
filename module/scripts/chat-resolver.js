import { CGMPSettings, CGMP_OPTIONS } from "./settings.js";

const CHAT_MESSAGE_TYPES = {
	DESCRIPTION: '#CGMP_DESCRIPTION'
}

export class ChatResolver {

	static monkeyPatchFoundryMethods() {
		let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

		ChatLog.parse = (message) => {
			// Dice roll regex
			let formula = '([^#]*)';                  // Capture any string not starting with '#'
			formula += '(?:(?:#\\s?)(.*))?';          // Capture any remaining flavor text
			const roll = '^(\\/r(?:oll)? )';          // Regular rolls, support /r or /roll
			const gm = '^(\\/gmr(?:oll)? )';          // GM rolls, support /gmr or /gmroll
			const br = '^(\\/b(?:lind)?r(?:oll)? )';  // Blind rolls, support /br or /blindroll
			const sr = '^(\\/s(?:elf)?r(?:oll)? )';   // Self rolls, support /sr or /sroll
			const any = '([^]*)';                     // Any character, including new lines

			// Define regex patterns
			const patterns = {
				"roll": new RegExp(roll+formula, 'i'),
				"gmroll": new RegExp(gm+formula, 'i'),
				"blindroll": new RegExp(br+formula, 'i'),
				"selfroll": new RegExp(sr+formula, 'i'),
				"ic": new RegExp('^(\/ic )'+any, 'i'),
				"ooc": new RegExp('^(\/ooc )'+any, 'i'),
				"emote": new RegExp('^(\/(?:em(?:ote)?|me) )'+any, 'i'),
				"whisper": new RegExp(/^(@|\/w(?:hisper)?\s{1})(\[(?:[^\]]+)\]|(?:[^\s]+))\s+([^]*)/, 'i'),

				// extended commands
				"as": new RegExp(/^(\/as )(\((?:[^\)]+)\)|\[(?:[^\]]+)\]|(?:[^\s]+))\s+([^]*)/, 'i'),
				"desc": new RegExp('^(\/desc )'+any, 'i'),

				"invalid": /^(\/[^\s]+)/, // Any other message starting with a slash command is invalid
			};
		
			// Iterate over patterns, finding the first match
			let c, rgx, match;
			for ( [c, rgx] of Object.entries(patterns) ) {
				if (["as", "desc"].includes(c) && !game.user.isGM) continue;
				match = message.match(rgx); 
				if ( match ) return [c, match];
			}
			return ["none", [message, "", message]];
		};

		ChatLog.prototype._processExtendedCommand = (command, match, chatData, createOptions) => {
			if (command === "as") {
				const alias = match[2].replace(/[\[\]]|[\(\)]/g, "");
				chatData.type = CONST.CHAT_MESSAGE_TYPES.IC;
				chatData.speaker = {};
				chatData.speaker.alias = alias;
				chatData.content = match[3];
			} else if (command === "desc") {
				chatData.type = CHAT_MESSAGE_TYPES.OOC;
				chatData.speaker = {};
				chatData.speaker.alias = CHAT_MESSAGE_TYPES.DESCRIPTION;
				chatData.content = match[2];
			}
		};

		ChatLog.prototype.processMessage = new AsyncFunction('message', 
			`const cls = CONFIG.ChatMessage.entityClass;

			// Set up basic chat data
			const chatData = {
				user: game.user._id,
				speaker: cls.getSpeaker()
			};

			// Allow for handling of the entered message to be intercepted by a hook
			if ( Hooks.call("chatMessage", this, message, chatData) === false ) return;

			// Alter the message content, if needed
			message = message.replace(/\\n/g, "<br>");
		
			// Parse the message to determine the matching handler
			let [command, match] = this.constructor.parse(message);
		
			// Special handlers for no command
			if ( command === "invalid" ) throw new Error(game.i18n.format("CHAT.InvalidCommand", {command: match[1]}));
			else if ( command === "none" ) command = chatData.speaker.token ? "ic" : "ooc";
		
			// Process message data based on the identified command type
			const createOptions = {};
			switch (command) {
				case "roll": case "gmroll": case "blindroll": case "selfroll":
					this._processDiceCommand(command, match, chatData, createOptions);
					break;
				case "whisper":
					this._processWhisperCommand(command, match, chatData, createOptions);
					break;
				case "ic": case "emote": case "ooc":
					this._processChatCommand(command, match, chatData, createOptions);
					break;
				case "as": case "desc":
					this._processExtendedCommand(command, match, chatData, createOptions);
					break;
			}

			// Create the message using provided data and options
			return cls.create(chatData, createOptions);`
		);
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
						scene: null,
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
					scene: null,
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
		if (messageData.message.speaker.alias === CHAT_MESSAGE_TYPES.DESCRIPTION) {
			html[0].classList.add('desc');
		}
	}

}
