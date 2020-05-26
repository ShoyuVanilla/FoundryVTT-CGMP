const PACKET_HEADER = {
	OTHER: 0,
	TYPING_MESSAGE: 1,
	TYPING_END: 2
}

const REMOTE_TYPING_TIMEOUT = 5000;
const TYPING_EMIT_INTERVAL = 200;

export class TypingNotifier {
	#notifyWrapperElement;
	#notifyDiv;
	#typingUsers;
	#isNoticeVisible;
	#lastPacketSent;

	constructor() {
		this.#typingUsers = new Map();
		this.#isNoticeVisible = false;
		this._render();
		game.socket.on('module.CautiousGamemastersPack', data => this._onRemotePacket(data));
	}

	_render() {
		this.#notifyWrapperElement = document.createElement("div");
		this.#notifyWrapperElement.className = "typing-notify hidden";
		let element = document.getElementById("chat-controls");
		element.appendChild(this.#notifyWrapperElement);
		let innerWrapper = document.createElement("div");
		innerWrapper.innerHTML = '<span class="dots-cont"><span class="dot dot-1"></span><span class="dot dot-2"></span><span class="dot dot-3"></span></span>';
		this.#notifyWrapperElement.appendChild(innerWrapper);
		this.#notifyDiv = document.createElement("div");
		this.#notifyDiv.className = "notify-text";
		innerWrapper.appendChild(this.#notifyDiv);
		this.#isNoticeVisible = false;
	}

	_emitTypingEnd() {
		game.socket.emit('module.CautiousGamemastersPack', {
			header: PACKET_HEADER.TYPING_END,
			user: game.user.id
		});
		this.#lastPacketSent = undefined;
	}

	_emitTyping() {
		if (this.#lastPacketSent && new Date().getTime - this.#lastPacketSent < TYPING_EMIT_INTERVAL) return;
		game.socket.emit('module.CautiousGamemastersPack', {
			header: PACKET_HEADER.TYPING_MESSAGE,
			user: game.user.id
		});
		this.#lastPacketSent = new Date().getTime;
	}

	_setVisible(visible) {
		if (!this.#notifyWrapperElement || visible === this.#isNoticeVisible) return;
		this.#isNoticeVisible = visible;
		this.#notifyWrapperElement.classList.toggle('hidden');
	}

	_onRemoteTypingEnded(id) {
		this.#typingUsers.delete(id);
		this.updateNotice();
	}

	onChatKeyDown(event) {
		if (!event.currentTarget.value) return;
		const code = game.keyboard.getKey(event);
		if ((code === "Enter") && !event.shiftKey) {
			this._emitTypingEnd();
		} else {
			this._emitTyping();
		}
	}

	_onRemotePacket(data) {
		let id = data.user;
		if (id === game.user.id) return;
		switch (data.header) {
			case PACKET_HEADER.TYPING_MESSAGE:
				let pushed = true;
				if (this.#typingUsers.has(id)) { pushed = false; clearTimeout(this.#typingUsers.get(id)); }
				this.#typingUsers.set(id,
					setTimeout(() => this._onRemoteTypingEnded(id), REMOTE_TYPING_TIMEOUT));
				if (pushed) this.updateNotice();
				break;
			case PACKET_HEADER.TYPING_END:
				if (this.#typingUsers.has(id)) clearTimeout(this.#typingUsers.get(id));
				this._onRemoteTypingEnded(id);
				break;
			default:
				return;
		}
	}

	updateNotice() {
		if (!this.#notifyWrapperElement) return;
		const mapSize = this.#typingUsers.size;
		if (mapSize === 0) {
			this._setVisible(false);
			return;
		}

		let text = '';
		let cnt = 0;
		let users = [];

		this.#typingUsers.forEach((value, key) => {
			users.push(game.users.get(key).name);
			cnt++;
		});

		if (cnt == 1) {
			text = game.i18n.format("cgmp.typing-one", { user: users[0] });
		} else if (cnt == 2) {
			text = game.i18n.format("cgmp.typing-two", { user1: users[0], user2: users[1] });
		} else {
			text = game.i18n.format("cgmp.typing-many", { user1: users[0], user2: users[1], others: cnt - 2 });
		}
		this.#notifyDiv.innerHTML = text;

		this._setVisible(true);
	}
}