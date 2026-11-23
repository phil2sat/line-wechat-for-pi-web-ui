#!/usr/bin/env python3
"""JSON-lines bridge between pi-web-ui and the OkLine personal-account client."""

from __future__ import annotations

import base64
import json
import os
import sys
import threading
import traceback
from pathlib import Path
from typing import Any

from okline import OkLine
from qrcode import QRCode
from qrcode.image.svg import SvgPathImage

SESSION_PATH = Path(sys.argv[1]).expanduser()
api: OkLine | None = None
write_lock = threading.Lock()
login_lock = threading.Lock()


def emit(payload: dict[str, Any]) -> None:
    with write_lock:
        sys.stdout.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
        sys.stdout.flush()


def qr_data_uri(url: str) -> str:
    qr = QRCode(border=4, box_size=8)
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(image_factory=SvgPathImage)
    raw = image.to_string(encoding="unicode")
    encoded = base64.b64encode(raw.encode("utf-8")).decode("ascii")
    return "data:image/svg+xml;base64," + encoded


def current_api() -> OkLine:
    global api
    if api is None:
        if not SESSION_PATH.is_file():
            raise RuntimeError("LINE is not logged in. Start QR login first.")
        api = OkLine.from_tokens_file(str(SESSION_PATH), auto_refresh_schedule=True)
    return api


def safe_message(message: dict[str, Any]) -> dict[str, Any]:
    client = current_api()
    try:
        return client.decrypt_message(message)
    except Exception:
        return {**message, "text": "[encrypted — could not decrypt]"}


def login() -> None:
    global api
    if not login_lock.acquire(blocking=False):
        emit({"event": "error", "error": "A LINE login is already running."})
        return

    def run() -> None:
        global api
        client: OkLine | None = None
        try:
            client = OkLine(auto_refresh_schedule=True)
            result = client.qr_login(
                on_qr=lambda url: emit({"event": "qr", "image": qr_data_uri(url)}),
                on_pin=lambda pin: emit({"event": "pin", "pin": str(pin)}),
                wait_seconds=240,
            )
            if not result.success or not result.access_token:
                raise RuntimeError(result.display_message or f"LINE login failed (type={result.type}).")
            SESSION_PATH.parent.mkdir(parents=True, exist_ok=True)
            client.save_tokens(str(SESSION_PATH))
            try:
                os.chmod(SESSION_PATH, 0o600)
            except OSError:
                pass
            if api is not None:
                try:
                    api.close()
                except Exception:
                    pass
            api = client
            profile = api.get_profile() or {}
            emit({
                "event": "login-complete",
                "profile": {
                    "name": profile.get("displayName") or "LINE account",
                    "mid": profile.get("mid") or "",
                },
            })
        except Exception as exc:
            if client is not None and client is not api:
                try:
                    client.close()
                except Exception:
                    pass
            emit({"event": "error", "error": str(exc)})
        finally:
            login_lock.release()

    threading.Thread(target=run, name="line-qr-login", daemon=True).start()


def dispatch(request: dict[str, Any]) -> None:
    request_id = request.get("id")
    action = str(request.get("action") or "")
    try:
        if action == "login":
            login()
            return
        if action == "state":
            if not SESSION_PATH.is_file():
                emit({"id": request_id, "ok": True, "loggedIn": False})
                return
            client = current_api()
            profile = client.get_profile() or {}
            emit({
                "id": request_id,
                "ok": True,
                "loggedIn": True,
                "profile": {"name": profile.get("displayName") or "LINE account", "mid": profile.get("mid") or ""},
                "e2eeReady": bool(client.e2ee.is_ready()),
            })
            return
        if action == "list_conversations":
            client = current_api()
            result = client.get_message_boxes(limit=max(1, min(100, int(request.get("limit") or 50))))
            boxes = result.get("messageBoxes", []) if isinstance(result, dict) else []
            ids = [str(box.get("id") or "") for box in boxes if isinstance(box, dict) and box.get("id")]
            chat_names: dict[str, str] = {}
            if ids:
                chats_result = client.get_chats(ids)
                for chat in (chats_result.get("chats", []) if isinstance(chats_result, dict) else []):
                    if isinstance(chat, dict):
                        mid = str(chat.get("chatMid") or chat.get("mid") or "")
                        chat_names[mid] = str(chat.get("chatName") or "")
            conversations = []
            for box in boxes:
                if not isinstance(box, dict):
                    continue
                mid = str(box.get("id") or "")
                last = (box.get("lastMessages") or [{}])[0] if box.get("lastMessages") else {}
                conversations.append({
                    "chatId": mid,
                    "name": chat_names.get(mid) or str(box.get("name") or mid),
                    "unreadCount": int(box.get("unreadCount") or 0),
                    "preview": str(last.get("text") or ""),
                    "lastMessageAt": last.get("createdTime") or 0,
                })
            emit({"id": request_id, "ok": True, "conversations": conversations})
            return
        if action == "get_chat_messages":
            client = current_api()
            chat_id = str(request.get("chatId") or "")
            count = max(1, min(100, int(request.get("count") or 40)))
            raw = client.get_recent_messages(chat_id, count) or []
            messages = []
            for item in raw:
                if not isinstance(item, dict):
                    continue
                msg = safe_message(item)
                messages.append({
                    "id": str(msg.get("id") or ""),
                    "sender": str(msg.get("from") or ""),
                    "text": str(msg.get("text") or ""),
                    "timestamp": int(msg.get("createdTime") or 0),
                    "contentType": int(msg.get("contentType") or 0),
                    "encrypted": bool(msg.get("chunks")),
                })
            emit({"id": request_id, "ok": True, "messages": messages})
            return
        if action == "send_message":
            client = current_api()
            chat_id = str(request.get("chatId") or "")
            text = str(request.get("text") or "").strip()
            if not chat_id or not text:
                raise ValueError("chatId and text are required.")
            result = client.send_text(chat_id, text)
            emit({"id": request_id, "ok": True, "sent": True, "result": result})
            return
        if action == "logout":
            if api is not None:
                try:
                    api.auth.logout()
                finally:
                    api.close()
                    api = None
            try:
                SESSION_PATH.unlink(missing_ok=True)
            except OSError:
                pass
            emit({"id": request_id, "ok": True, "loggedIn": False})
            return
        if action == "shutdown":
            emit({"id": request_id, "ok": True})
            raise SystemExit(0)
        raise ValueError(f"Unknown bridge action: {action}")
    except SystemExit:
        raise
    except Exception as exc:
        emit({"id": request_id, "ok": False, "error": str(exc)})


def main() -> None:
    for line in sys.stdin:
        try:
            request = json.loads(line)
            if isinstance(request, dict):
                dispatch(request)
        except SystemExit:
            break
        except Exception:
            emit({"event": "error", "error": traceback.format_exc(limit=3)})


if __name__ == "__main__":
    main()
