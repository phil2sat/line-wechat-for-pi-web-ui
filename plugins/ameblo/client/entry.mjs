const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

export default {
  mount(container, ctx) {
    container.innerHTML = `
      <section class="ameblo">
        <style>
          .ameblo{padding:16px;display:grid;gap:12px;color:var(--text)}
          .ameblo section{border:1px solid var(--border);border-radius:9px;padding:12px;min-width:0}
          .ameblo input,.ameblo textarea{box-sizing:border-box;width:100%;padding:8px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font:inherit}
          .ameblo textarea{min-height:80px;resize:vertical}
          .ameblo button{font:inherit;padding:7px 11px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);cursor:pointer}
          .ameblo button:disabled{opacity:.45;cursor:default}
          .ameblo .row{display:flex;gap:8px;flex-wrap:wrap}
          .ameblo .row button{white-space:nowrap}
          .ameblo .muted{color:var(--text-muted);font-size:12px}
          .ameblo .list{display:grid;gap:8px}
          .ameblo .item{padding:8px;border:1px solid var(--border);border-radius:7px;display:grid;gap:5px}
          .ameblo .images{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
          .ameblo .images img{width:100%;max-height:220px;object-fit:contain;background:var(--surface);border-radius:6px}
          .ameblo .error{color:var(--error,#d55);white-space:pre-wrap}
          .ameblo a{color:var(--accent)}
        </style>
        <section>
          <strong>Ameblo session</strong>
          <p class="muted">Public search and reading do not require login. Comments require an authenticated session cookie. The cookie is stored in plugin storage on this server; treat it like a password.</p>
          <textarea data-ref="cookie" placeholder="Paste the Cookie header value from an authenticated ameblo.jp browser request"></textarea>
          <div class="row"><button data-ref="save-cookie">Save session cookie</button><span class="muted" data-ref="cookie-status"></span></div>
        </section>
        <section>
          <strong>Search public entries</strong>
          <div class="row" style="margin-top:8px"><input data-ref="query" placeholder="Search keywords (Japanese supported)" /><button data-ref="search">Search</button></div>
          <div class="list" data-ref="results" style="margin-top:10px"></div>
        </section>
        <section>
          <strong>Article</strong>
          <div data-ref="entry" class="muted" style="margin-top:8px">Select an entry to read it.</div>
        </section>
        <section>
          <strong>Comment drafts — explicit approval required</strong>
          <div data-ref="drafts" class="list" style="margin-top:8px"></div>
        </section>
        <div class="error" data-ref="error"></div>
      </section>`;
    const $ = (key) => container.querySelector('[data-ref="' + key + '"]');
    let state = { results: [], entry: null, drafts: [], busy: false, cookieConfigured: false };
    const send = (action, extra = {}) => ctx.send({ action: "ameblo:" + action, ...extra });
    const render = () => {
      $("cookie-status").textContent = state.cookieConfigured ? "Session cookie configured" : "No session cookie";
      $("results").innerHTML = (state.results ?? []).map((item) =>
        '<article class="item"><strong>' + esc(item.title) + '</strong><a href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' + esc(item.url) + '</a><div><button data-read="' + esc(item.url) + '">Read entry</button></div></article>'
      ).join("") || '<span class="muted">No search results.</span>';
      if (state.entry) {
        const e = state.entry;
        $("entry").innerHTML = '<h3>' + esc(e.title) + '</h3><div class="muted">' + esc(e.author) + ' ' + esc(e.published) + '</div><a href="' + esc(e.url) + '" target="_blank" rel="noopener noreferrer">Open original entry</a><p style="white-space:pre-wrap">' + esc(e.content) + '</p><div class="images">' + (e.images ?? []).map((url) => '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="' + esc(url) + '" alt="Ameblo article image" /></a>').join("") + '</div>';
      }
      $("drafts").innerHTML = (state.drafts ?? []).slice().reverse().map((draft) =>
        '<article class="item"><strong>' + esc(draft.title) + '</strong><a href="' + esc(draft.url) + '" target="_blank" rel="noopener noreferrer">Open entry</a><div style="white-space:pre-wrap">' + esc(draft.text) + '</div><span class="muted">' + esc(draft.status) + '</span>' +
        (draft.error ? '<div class="error">' + esc(draft.error) + '</div>' : '') +
        (draft.status === "pending" ? '<div class="row"><button data-approve="' + esc(draft.id) + '">Publish exact comment</button><button data-reject="' + esc(draft.id) + '">Reject</button></div>' : '') + '</article>'
      ).join("") || '<span class="muted">No comment drafts.</span>';
      $("search").disabled = state.busy;
    };
    $("save-cookie").addEventListener("click", () => send("save-cookie", { cookie: $("cookie").value }));
    $("search").addEventListener("click", () => { $("error").textContent = ""; send("search", { query: $("query").value, limit: 20 }); });
    $("query").addEventListener("keydown", (event) => { if (event.key === "Enter") $("search").click(); });
    $("results").addEventListener("click", (event) => {
      const button = event.target.closest("[data-read]");
      if (button) send("read", { url: button.dataset.read });
    });
    $("drafts").addEventListener("click", (event) => {
      const approve = event.target.closest("[data-approve]");
      const reject = event.target.closest("[data-reject]");
      if (approve && globalThis.confirm("Publish this exact comment to Ameblo?")) send("approve", { draftId: approve.dataset.approve });
      if (reject) send("reject", { draftId: reject.dataset.reject });
    });
    const off = ctx.onData((payload) => {
      if (payload?.kind === "ameblo-state" && payload.state) { state = { ...state, ...payload.state }; render(); }
      if (payload?.kind === "ameblo-error") $("error").textContent = String(payload.error ?? "");
      if (payload?.kind === "ameblo-result") $("error").textContent = String(payload.text ?? "");
    });
    send("state");
    return () => { off?.(); container.innerHTML = ""; };
  },
};
