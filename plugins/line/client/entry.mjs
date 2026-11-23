const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.conversations)) return value.conversations;
  if (Array.isArray(value?.messages)) return value.messages;
  return [];
}

export default {
  mount(container, ctx) {
    container.innerHTML = `
      <section class="line-panel">
        <style>
          .line-panel{padding:16px;display:grid;gap:14px;color:var(--text)}
          .line-panel button,.line-panel input{font:inherit}
          .line-panel button{padding:7px 11px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);cursor:pointer}
          .line-panel button:disabled{opacity:.45;cursor:default}
          .line-panel input{padding:8px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);min-width:0}
          .line-grid{display:grid;grid-template-columns:minmax(210px,1fr) minmax(280px,2fr);gap:14px}
          .line-box{border:1px solid var(--border);border-radius:9px;padding:12px;min-width:0}
          .line-list{display:grid;gap:6px;max-height:420px;overflow:auto}
          .line-item{display:grid;gap:4px;text-align:left;width:100%}
          .line-muted{color:var(--text-muted);font-size:12px}
          .line-message{padding:8px 0;border-bottom:1px solid var(--border);white-space:pre-wrap;overflow-wrap:anywhere}
          .line-draft{display:grid;gap:7px;padding:10px;border:1px solid var(--border);border-radius:8px;margin-top:8px}
          .line-actions{display:flex;gap:8px;flex-wrap:wrap}
          .line-error{color:var(--error,#d55);white-space:pre-wrap}
          @media(max-width:700px){.line-grid{grid-template-columns:1fr}}
        </style>
        <header>
          <strong>Personal LINE account</strong>
          <span data-ref="status" class="line-muted">Not connected</span>
        </header>
        <div class="line-box">
          <strong>Login / session</strong>
          <div class="line-actions" style="margin-top:8px">
            <input data-ref="phone" placeholder="Phone number, e.g. +491..." />
            <input data-ref="region" placeholder="Region, e.g. DE" value="DE" style="width:80px" />
            <button data-ref="login">Start login</button>
            <button data-ref="complete">Complete login</button>
            <button data-ref="refresh">Refresh chats</button>
          </div>
          <p class="line-muted">Enable “Allow login on other devices” in LINE on your primary phone first. Yomi may sign out the official LINE Desktop client.</p>
        </div>
        <div class="line-grid">
          <div class="line-box">
            <strong>Conversations</strong>
            <div data-ref="chats" class="line-list" style="margin-top:8px">Refresh to load conversations.</div>
          </div>
          <div class="line-box">
            <strong>Messages</strong>
            <div data-ref="messages" class="line-list" style="margin-top:8px">Select a conversation.</div>
          </div>
        </div>
        <div class="line-box">
          <strong>Reply drafts — explicit approval required</strong>
          <div data-ref="drafts"></div>
        </div>
        <div data-ref="error" class="line-error"></div>
      </section>`;

    const $ = (key) => container.querySelector(`[data-ref="${key}"]`);
    let state = { chats: [], messages: [], drafts: [], busy: false };
    const send = (action, extra = {}) => ctx.send({ action: `line:${action}`, ...extra });
    const showError = (value) => { $("error").textContent = String(value ?? ""); };

    function render() {
      $("status").textContent = state.busy ? "Working…" : (state.connected ? "Yomi connected" : "Not connected");
      const chats = asArray(state.chats);
      $("chats").innerHTML = chats.length ? chats.map((chat) => {
        const id = chat.chatId ?? chat.chat_id ?? chat.id ?? chat.mid ?? "";
        const name = chat.name ?? chat.chatName ?? chat.chat_name ?? chat.displayName ?? id;
        const preview = chat.lastMessage ?? chat.last_message ?? chat.preview ?? "";
        return `<button class="line-item" data-chat="${esc(id)}"><strong>${esc(name)}</strong><span class="line-muted">${esc(preview)}</span></button>`;
      }).join("") : "No conversations loaded.";
      $("messages").innerHTML = asArray(state.messages).map((message) => {
        const sender = message.fromName ?? message.from_name ?? message.senderName ?? message.sender_name ?? message.sender ?? "Message";
        const body = message.text ?? message.content ?? message.message ?? JSON.stringify(message);
        return `<div class="line-message"><strong>${esc(sender)}</strong><div>${esc(body)}</div><span class="line-muted">${esc(message.timestamp ?? message.createdAt ?? "")}</span></div>`;
      }).join("") || "Select a conversation.";
      $("drafts").innerHTML = (state.drafts ?? []).slice().reverse().map((draft) => `
        <article class="line-draft">
          <div><strong>${esc(draft.chatName)}</strong> <span class="line-muted">· ${esc(draft.targetLanguage)} · ${esc(draft.status)}</span></div>
          <div style="white-space:pre-wrap">${esc(draft.germanText)}</div>
          ${draft.translatedText ? `<div><strong>Translated:</strong><div style="white-space:pre-wrap">${esc(draft.translatedText)}</div></div>` : ""}
          ${draft.error ? `<div class="line-error">${esc(draft.error)}</div>` : ""}
          ${draft.status === "pending" ? `<div class="line-actions"><button data-approve="${esc(draft.id)}">Approve, translate and send</button><button data-reject="${esc(draft.id)}">Reject</button></div>` : ""}
        </article>`).join("") || '<p class="line-muted">No reply drafts.</p>';
      $("refresh").disabled = state.busy;
      $("login").disabled = state.busy;
      $("complete").disabled = state.busy;
    }

    $("login").addEventListener("click", () => {
      showError("");
      send("login", { phone: $("phone").value.trim(), region: $("region").value.trim() });
    });
    $("complete").addEventListener("click", () => { showError(""); send("login-complete"); });
    $("refresh").addEventListener("click", () => { showError(""); send("refresh"); });
    $("chats").addEventListener("click", (event) => {
      const button = event.target.closest("[data-chat]");
      if (button) send("open-chat", { chatId: button.dataset.chat });
    });
    $("drafts").addEventListener("click", (event) => {
      const approve = event.target.closest("[data-approve]");
      const reject = event.target.closest("[data-reject]");
      if (approve && globalThis.confirm("Send this exact draft after translation?")) send("approve", { draftId: approve.dataset.approve });
      if (reject) send("reject", { draftId: reject.dataset.reject });
    });

    const off = ctx.onData((payload) => {
      if (payload?.kind === "line-state" && payload.state) {
        state = { ...state, ...payload.state };
        render();
      } else if (payload?.kind === "line-error") showError(payload.error);
      else if (payload?.kind === "line-result") showError(payload.text);
    });
    send("state");
    return () => { off?.(); container.innerHTML = ""; };
  },
};
