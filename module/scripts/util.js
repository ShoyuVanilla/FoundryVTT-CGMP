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

export class Util {
    static isV10() {
		return !isNewerVersion("10", game.version ?? game.data.version);
	}

	static getMessageData(message) {
		return (Util.isV10() ? message : message.data);
	}

	static isEmpty(obj) {
		return (Util.isV10() ? isEmpty : isObjectEmpty)(obj);
	}

	static isRoll(messageData) {
		return (Util.isV10() ? (messageData.rolls.length > 0) : !!messageData.roll);
	}

	static isTokenHidden(token) {
		return (Util.isV10() ? token?.document?.hidden : token?.data?.hidden);
	}

	static updateMessageData(messageData, ...args) {
		const updateFn = (Util.isV10() ? messageData.updateSource : messageData.update);
		return updateFn.apply(messageData, args);
	}
}
