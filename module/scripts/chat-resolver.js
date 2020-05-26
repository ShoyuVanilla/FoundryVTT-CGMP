import { CGMPSettings, CGMP_OPTIONS } from "./settings.js";

const CHAT_MESSAGE_TYPES = {
	DESCRIPTION: '#CGMP_DESCRIPTION'
}

export class ChatResolver {
	static _resolveExtendedChatCommands(messageData) {
		if (!game.user.isGM) return false;
		const asPattern = new RegExp(/^(\/as )(\((?:[^\)]+)\)|\[(?:[^\]]+)\]|(?:[^\s]+))\s+([^]*)/, 'i');
		const descPattern = new RegExp('^(\/desc )([^]*)', 'i');
	
		let asMatch = messageData.content.match(asPattern);
		if (asMatch) {
		  let alias = asMatch[2].replace(/[\[\]]|[\(\)]/g, "");
		  messageData.speaker = {};
		  messageData.speaker.alias = alias;
		  messageData.content = asMatch[3];
		  messageData.type = CONST.CHAT_MESSAGE_TYPES.IC;
		  return true;
		}
	
		let descMatch = messageData.content.match(descPattern);
		if (descMatch) {
		  messageData.speaker = {};
		  messageData.speaker.alias = CHAT_MESSAGE_TYPES.DESCRIPTION;
		  messageData.content = descMatch[2];
		  messageData.type = CONST.CHAT_MESSAGE_TYPES.OOC;
		  return true;
		}
	
		return false;
	}

	static _resolveHiddenToken(messageData) {
		if (!game.user.isGM) return;
		if (!CGMPSettings.getSetting(CGMP_OPTIONS.BLIND_HIDDEN_TOKENS)) return;
		const speaker = messageData.speaker;
		if (!speaker) return;
		const token = canvas.tokens.get(speaker.token);
		if (token && token.data.hidden) {
			messageData.whisper = ChatMessage.getWhisperRecipients("GM");
		}
	}

	static _resolvePCToken(messageData) {
		if (!game.user.isGM) return;
		if (!CGMPSettings.getSetting(CGMP_OPTIONS.DISABLE_GM_AS_PC)) return;
		const speaker = messageData.speaker;
		if (!speaker) return;
		const token = canvas.tokens.get(speaker.token);
		if (!messageData.roll && token && token.actor && token.actor.isPC) {
			messageData.speaker = {};
			messageData.speaker.alias = game.users.get(messageData.user).name;
			messageData.type = CONST.CHAT_MESSAGE_TYPES.OOC;
		}
	}

	static resolvePreCreateMessage(messageData) {
		if (ChatResolver._resolveExtendedChatCommands(messageData)) return;
		ChatResolver._resolveHiddenToken(messageData);
		ChatResolver._resolvePCToken(messageData); 
	}

	static resolveRenderMessage(chatMessage, html, messageData) {
		if (messageData.message.speaker.alias === CHAT_MESSAGE_TYPES.DESCRIPTION) {
			html[0].className = html[0].className + 'desc'
		}
	}
}