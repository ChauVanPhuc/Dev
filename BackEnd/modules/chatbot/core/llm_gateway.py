# -*- coding: utf-8 -*-
"""
Unified Multi-Provider LLM Gateway & Gemini Web Cookie Manager.

Đặc điểm thiết kế:
- KHÔNG mặc định chạy cứng `AI/gemini-web-to-api`.
- Hỗ trợ cấu hình linh hoạt danh sách provider qua `CHATBOT_PROVIDER_CHAIN` trong `.env`:
  + `gemini_api`   : Google Gemini API chính thức (`google-genai`, mặc định `gemini-2.5-flash`, hỗ trợ xoay key).
  + `groq`         : Groq Cloud OpenAI-compatible (`llama-3.3-70b-versatile`).
  + `openrouter`   : OpenRouter OpenAI-compatible.
  + `ollama`       : Ollama Local (`http://localhost:11434/v1`).
  + `local_gemini` : Proxy `AI/gemini-web-to-api` (Port 8081) — chỉ kích hoạt khi được cấu hình bật.
- Tự động phát hiện trạng thái Cookie của `local_gemini` (`online` | `cookie_expired` | `offline`)
  và cung cấp API cập nhật Cookie mới (hot-reload qua `/admin/cookies` + lưu `.env`).
- Circuit Breaker cho từng provider (cooldown khi gặp 401/429/503/timeout).
"""
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
import requests

logger = logging.getLogger("chatbot.llm_gateway")


@dataclass
class LLMToolCall:
    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class LLMResponse:
    content: str = ""
    tool_calls: List[LLMToolCall] = field(default_factory=list)
    provider: str = ""
    model: str = ""
    error: Optional[str] = None
    error_code: Optional[str] = None  # 'cookie_expired' | 'offline' | 'quota' | 'auth' | 'error'


class LLMGateway:
    def __init__(self):
        self._cooldowns: Dict[str, float] = {}
        self._gemini_key_idx: int = 0
        self._last_cookie_error: Optional[str] = None

    # ───────────────────────── Configuration Helpers ─────────────────────────

    def _get_gemini_api_keys(self) -> List[str]:
        keys = [
            os.getenv("GEMINI_API_KEY", "").strip(),
            os.getenv("GEMINI_API_KEY_BACKUP", "").strip(),
            os.getenv("GEMINI_API_KEY_BACKUP2", "").strip(),
        ]
        return [k for k in keys if k and not k.lower().startswith("your_")]

    def _get_local_gemini_config(self) -> Dict[str, str]:
        url = os.getenv("LOCAL_GEMINI_URL", "http://localhost:8081/openai/v1/chat/completions").strip()
        base_root = url.split("/openai/v1")[0].rstrip("/")
        if not base_root:
            base_root = "http://localhost:8081"
        openai_base = url.split("/chat/completions")[0].rstrip("/")
        return {
            "enabled": os.getenv("LOCAL_GEMINI_ENABLED", "false").strip().lower(),
            "chat_url": url,
            "openai_base": openai_base,
            "root_url": base_root,
            "model": os.getenv("LOCAL_GEMINI_MODEL", "gemini-auto").strip(),
            "api_key": os.getenv("LOCAL_GEMINI_API_KEY", "not-needed").strip(),
            "cookie_api_key": os.getenv("GEMINI_COOKIE_API_KEY", "").strip(),
            "env_path": os.getenv(
                "LOCAL_GEMINI_ENV_PATH",
                os.path.abspath(
                    os.path.join(
                        os.path.dirname(__file__),
                        "..", "..", "..", "..", "AI", "gemini-web-to-api", ".env",
                    )
                ),
            ),
        }

    def get_provider_chain(self) -> List[str]:
        """
        Trả về thứ tự provider được cấu hình.
        Không tự động chạy `local_gemini` trừ khi người dùng bật `LOCAL_GEMINI_ENABLED=true`
        hoặc liệt kê rõ `local_gemini` trong `CHATBOT_PROVIDER_CHAIN`.
        """
        raw_chain = os.getenv("CHATBOT_PROVIDER_CHAIN", "").strip()
        if raw_chain:
            return [p.strip().lower() for p in raw_chain.split(",") if p.strip()]

        chain: List[str] = []
        if self._get_gemini_api_keys():
            chain.append("gemini_api")
        if os.getenv("GROQ_API_KEY", "").strip() and not os.getenv("GROQ_API_KEY", "").strip().startswith("your_"):
            chain.append("groq")
        if os.getenv("OPENROUTER_API_KEY", "").strip():
            chain.append("openrouter")
        if os.getenv("OLLAMA_URL", "").strip():
            chain.append("ollama")
        if os.getenv("LOCAL_GEMINI_ENABLED", "false").strip().lower() in ("1", "true", "yes"):
            chain.append("local_gemini")
        return chain

    # ───────────────────────── Circuit Breaker ─────────────────────────

    def is_in_cooldown(self, provider: str) -> bool:
        return time.time() < self._cooldowns.get(provider, 0)

    def set_cooldown(self, provider: str, seconds: int = 90):
        self._cooldowns[provider] = time.time() + seconds
        logger.warning(f"[LLMGateway] Provider '{provider}' tạm nghỉ {seconds}s do lỗi.")

    def reset_cooldown(self, provider: str):
        self._cooldowns.pop(provider, None)

    # ───────────────────────── Local Gemini Cookie Manager ─────────────────────────

    def _read_cookie_api_key_from_proxy_env(self, env_path: str) -> str:
        """Đọc GEMINI_COOKIE_API_KEY từ file .env của gemini-web-to-api nếu BackEnd/.env chưa đặt."""
        if not env_path or not os.path.exists(env_path):
            return ""
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    s = line.strip()
                    if s.startswith("GEMINI_COOKIE_API_KEY="):
                        return s.split("=", 1)[1].strip().strip('"').strip("'")
        except Exception:
            pass
        return ""

    def get_local_gemini_cookie_status(self) -> Dict[str, Any]:
        """
        Kiểm tra chi tiết trạng thái của proxy `gemini-web-to-api`:
        - status: 'online' | 'cookie_expired' | 'offline' | 'disabled'
        """
        cfg = self._get_local_gemini_config()
        chain = self.get_provider_chain()
        enabled = cfg["enabled"] in ("1", "true", "yes") or ("local_gemini" in chain)

        cookie_api_key = cfg["cookie_api_key"] or self._read_cookie_api_key_from_proxy_env(cfg["env_path"])

        # 1. Kiểm tra server có đang chạy không (/openai/v1/models)
        headers = {"Authorization": f"Bearer {cfg['api_key']}"} if cfg["api_key"] else {}
        try:
            res = requests.get(f"{cfg['openai_base']}/models", headers=headers, timeout=2.5)
        except Exception as e:
            return {
                "enabled": enabled,
                "status": "offline" if enabled else "disabled",
                "server_running": False,
                "cookie_valid": False,
                "cookie_api_enabled": bool(cookie_api_key),
                "message": f"Dịch vụ Gemini Web Proxy chưa chạy tại {cfg['root_url']}.",
                "detail": str(e),
            }

        # 2. Nếu có GEMINI_COOKIE_API_KEY, hỏi trực tiếp GET /admin/cookies để biết chính xác trạng thái phiên
        if cookie_api_key:
            try:
                c_res = requests.get(
                    f"{cfg['root_url']}/admin/cookies",
                    headers={"Authorization": f"Bearer {cookie_api_key}"},
                    timeout=3.0,
                )
                if c_res.status_code == 200:
                    data = c_res.json()
                    return {
                        "enabled": enabled,
                        "status": "online",
                        "server_running": True,
                        "cookie_valid": True,
                        "cookie_api_enabled": True,
                        "psid_fingerprint": data.get("psid_fingerprint"),
                        "cache_age_seconds": data.get("cache_age_seconds"),
                        "updated_at": data.get("updated_at"),
                        "source": data.get("source"),
                        "message": "Phiên Gemini Web đang hoạt động bình thường.",
                    }
                elif c_res.status_code == 503:
                    return {
                        "enabled": enabled,
                        "status": "cookie_expired",
                        "server_running": True,
                        "cookie_valid": False,
                        "cookie_api_enabled": True,
                        "message": "Cookie Gemini Web đã hết hạn hoặc không hợp lệ. Vui lòng cập nhật Cookie mới.",
                    }
                elif c_res.status_code == 404:
                    # Proxy đang chạy nhưng chưa bật GEMINI_COOKIE_API_KEY khi khởi động
                    pass
            except Exception as e:
                logger.debug(f"[CookieStatus] Lỗi gọi /admin/cookies: {e}")

        # 3. Fallback: kiểm tra phản hồi /models và lỗi gần nhất
        if res.status_code == 200:
            try:
                body_json = res.json() or {}
            except Exception:
                body_json = {}
            raw_models = body_json.get("data") if isinstance(body_json, dict) else None
            models = [m.get("id") for m in (raw_models or []) if isinstance(m, dict) and m.get("id")]

            if not models or self._last_cookie_error:
                return {
                    "enabled": enabled,
                    "status": "cookie_expired",
                    "server_running": True,
                    "cookie_valid": False,
                    "cookie_api_enabled": bool(cookie_api_key),
                    "models": models,
                    "message": "Cookie Gemini Web đã hết hạn hoặc không hợp lệ (chưa khởi tạo được phiên Gemini). Vui lòng cập nhật Cookie mới.",
                    "detail": self._last_cookie_error or "Danh sách model trả về rỗng (data: null).",
                }
            return {
                "enabled": enabled,
                "status": "online",
                "server_running": True,
                "cookie_valid": True,
                "cookie_api_enabled": bool(cookie_api_key),
                "models": models,
                "message": "Gemini Web Proxy đang trực tuyến.",
            }

        return {
            "enabled": enabled,
            "status": "cookie_expired" if res.status_code in (401, 403, 503) else "offline",
            "server_running": True,
            "cookie_valid": False,
            "cookie_api_enabled": bool(cookie_api_key),
            "message": f"Gemini Web Proxy phản hồi HTTP {res.status_code}. Có thể Cookie đã hết hạn.",
        }

    def update_local_gemini_cookie(self, raw_cookies: str, save_to_env: bool = True) -> Dict[str, Any]:
        """
        Cập nhật Cookie mới cho `gemini-web-to-api`:
        1. Kiểm tra định dạng cơ bản (__Secure-1PSID).
        2. Gọi `POST /admin/cookies` để hot-reload trực tiếp (nếu proxy đang bật GEMINI_COOKIE_API_KEY).
        3. Lưu vào file `.env` của `gemini-web-to-api` để giữ lại sau khi restart.
        4. Reset cooldown & trạng thái lỗi để chatbot dùng được ngay.
        """
        cookies = (raw_cookies or "").strip()
        # Cho phép người dùng dán cả chữ "Cookie: ..." từ DevTools
        if cookies.lower().startswith("cookie:"):
            cookies = cookies.split(":", 1)[1].strip()
        cookies = cookies.strip('"').strip("'")

        if not cookies:
            return {"success": False, "error": "Chuỗi Cookie không được để trống."}
        if "__Secure-1PSID=" not in cookies:
            return {
                "success": False,
                "error": "Chuỗi Cookie thiếu '__Secure-1PSID'. Vui lòng copy toàn bộ giá trị trường Cookie trong Request Headers tại gemini.google.com.",
            }

        cfg = self._get_local_gemini_config()
        cookie_api_key = cfg["cookie_api_key"] or self._read_cookie_api_key_from_proxy_env(cfg["env_path"])

        hot_reloaded = False
        hot_reload_info: Dict[str, Any] = {}
        hot_reload_warning: Optional[str] = None

        # Bước 1: Hot-reload qua API /admin/cookies nếu có key
        if cookie_api_key:
            try:
                res = requests.post(
                    f"{cfg['root_url']}/admin/cookies",
                    headers={
                        "Authorization": f"Bearer {cookie_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={"cookies": cookies},
                    timeout=15.0,
                )
                if res.status_code == 200:
                    hot_reloaded = True
                    hot_reload_info = res.json()
                elif res.status_code in (400, 502):
                    err_detail = res.json().get("error", res.text)
                    return {
                        "success": False,
                        "error": f"Google từ chối Cookie này ({err_detail}). Hãy tải lại trang gemini.google.com và lấy lại Cookie mới nhất.",
                    }
                elif res.status_code == 404:
                    hot_reload_warning = (
                        "Proxy chưa bật endpoint /admin/cookies (cần đặt GEMINI_COOKIE_API_KEY trong AI/gemini-web-to-api/.env và khởi động lại proxy 1 lần)."
                    )
                else:
                    hot_reload_warning = f"Proxy trả về HTTP {res.status_code}: {res.text[:200]}"
            except Exception as e:
                hot_reload_warning = f"Không kết nối được proxy tại {cfg['root_url']} để nạp nóng ({e})."
        else:
            hot_reload_warning = (
                "Chưa cấu hình GEMINI_COOKIE_API_KEY nên không thể nạp nóng qua API; Cookie sẽ được lưu vào file .env."
            )

        # Bước 2: Cập nhật vào file .env của gemini-web-to-api để bền vững sau khi restart
        env_saved = False
        env_path = cfg["env_path"]
        if save_to_env and env_path and os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()

                escaped = cookies.replace('"', '\\"')
                updated_cookie = False
                new_lines = []
                for line in lines:
                    if line.strip().startswith("GEMINI_COOKIES="):
                        new_lines.append(f'GEMINI_COOKIES="{escaped}"\n')
                        updated_cookie = True
                    else:
                        new_lines.append(line)
                if not updated_cookie:
                    new_lines.append(f'\nGEMINI_COOKIES="{escaped}"\n')

                with open(env_path, "w", encoding="utf-8") as f:
                    f.writelines(new_lines)
                env_saved = True
            except Exception as env_err:
                logger.error(f"[CookieManager] Lỗi ghi file .env ({env_path}): {env_err}")

        if hot_reloaded or env_saved:
            self._last_cookie_error = None
            self.reset_cooldown("local_gemini")
            return {
                "success": True,
                "hot_reloaded": hot_reloaded,
                "env_saved": env_saved,
                "info": hot_reload_info,
                "warning": hot_reload_warning,
                "message": (
                    "Đã xác thực và cập nhật Cookie Gemini mới thành công (nạp nóng không cần khởi động lại)!"
                    if hot_reloaded
                    else "Đã lưu Cookie mới vào file .env. Vui lòng khởi động lại dịch vụ Gemini Web Proxy để áp dụng."
                ),
            }

        return {
            "success": False,
            "error": hot_reload_warning or "Không thể cập nhật Cookie mới.",
        }

    # ───────────────────────── Health Check ─────────────────────────

    def get_health_status(self) -> Dict[str, Any]:
        chain = self.get_provider_chain()
        providers_status: Dict[str, Any] = {}

        gemini_keys = self._get_gemini_api_keys()
        providers_status["gemini_api"] = {
            "configured": bool(gemini_keys),
            "in_chain": "gemini_api" in chain,
            "status": "cooldown" if self.is_in_cooldown("gemini_api") else ("online" if gemini_keys else "unconfigured"),
            "model": os.getenv("GEMINI_API_MODEL", "gemini-2.5-flash"),
            "keys_count": len(gemini_keys),
        }

        groq_key = os.getenv("GROQ_API_KEY", "").strip()
        groq_ok = bool(groq_key and not groq_key.startswith("your_"))
        providers_status["groq"] = {
            "configured": groq_ok,
            "in_chain": "groq" in chain,
            "status": "cooldown" if self.is_in_cooldown("groq") else ("online" if groq_ok else "unconfigured"),
            "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        }

        or_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        providers_status["openrouter"] = {
            "configured": bool(or_key),
            "in_chain": "openrouter" in chain,
            "status": "cooldown" if self.is_in_cooldown("openrouter") else ("online" if or_key else "unconfigured"),
            "model": os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001"),
        }

        ollama_url = os.getenv("OLLAMA_URL", "").strip()
        providers_status["ollama"] = {
            "configured": bool(ollama_url),
            "in_chain": "ollama" in chain,
            "status": "online" if ollama_url else "unconfigured",
            "model": os.getenv("OLLAMA_MODEL", "qwen2.5:14b"),
        }

        local_status = self.get_local_gemini_cookie_status()
        providers_status["local_gemini"] = local_status

        any_online = any(
            p in providers_status and providers_status[p].get("status") == "online"
            for p in chain
        )
        cookie_expired = local_status.get("status") == "cookie_expired"

        return {
            "healthy": any_online,
            "active_chain": chain,
            "cookie_expired": cookie_expired,
            "providers": providers_status,
        }

    # ───────────────────────── Unified Chat Completion ─────────────────────────

    def chat(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.15,
    ) -> LLMResponse:
        """Gọi lần lượt các provider trong `CHATBOT_PROVIDER_CHAIN` cho đến khi có kết quả thành công."""
        chain = self.get_provider_chain()
        if not chain:
            return LLMResponse(
                error=(
                    "Chưa có AI Provider nào được cấu hình. Vui lòng thiết lập `GEMINI_API_KEY` (khuyến nghị), "
                    "`GROQ_API_KEY`, `OPENROUTER_API_KEY`, hoặc bật `LOCAL_GEMINI_ENABLED=true` trong file `BackEnd/.env`."
                ),
                error_code="unconfigured",
            )

        last_response: Optional[LLMResponse] = None
        for provider in chain:
            if self.is_in_cooldown(provider):
                continue

            if provider == "gemini_api":
                res = self._call_gemini_api(messages, tools, temperature)
            elif provider == "groq":
                res = self._call_openai_compat(
                    provider="groq",
                    url="https://api.groq.com/openai/v1/chat/completions",
                    api_key=os.getenv("GROQ_API_KEY", "").strip(),
                    model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                    messages=messages,
                    tools=tools,
                    temperature=temperature,
                )
            elif provider == "openrouter":
                res = self._call_openai_compat(
                    provider="openrouter",
                    url="https://openrouter.ai/api/v1/chat/completions",
                    api_key=os.getenv("OPENROUTER_API_KEY", "").strip(),
                    model=os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001"),
                    messages=messages,
                    tools=tools,
                    temperature=temperature,
                )
            elif provider == "ollama":
                ollama_base = os.getenv("OLLAMA_URL", "http://localhost:11434/v1").rstrip("/")
                res = self._call_openai_compat(
                    provider="ollama",
                    url=f"{ollama_base}/chat/completions",
                    api_key="ollama",
                    model=os.getenv("OLLAMA_MODEL", "qwen2.5:14b"),
                    messages=messages,
                    tools=tools,
                    temperature=temperature,
                    timeout=60.0,
                )
            elif provider == "local_gemini":
                res = self._call_local_gemini(messages, tools, temperature)
            else:
                continue

            if not res.error:
                return res

            last_response = res
            if res.error_code in ("quota", "offline", "cookie_expired", "auth"):
                self.set_cooldown(provider, seconds=60 if res.error_code != "cookie_expired" else 120)

        return last_response or LLMResponse(
            error="Tất cả các AI Provider hiện không khả dụng. Vui lòng thử lại sau.",
            error_code="offline",
        )

    # ───────────────────────── Provider Adapters ─────────────────────────

    def _call_gemini_api(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]],
        temperature: float,
    ) -> LLMResponse:
        keys = self._get_gemini_api_keys()
        if not keys:
            return LLMResponse(provider="gemini_api", error="Thiếu GEMINI_API_KEY", error_code="unconfigured")

        model_name = os.getenv("GEMINI_API_MODEL", "gemini-2.5-flash").strip()

        try:
            from google import genai
            from google.genai import types
        except Exception as e:
            return LLMResponse(provider="gemini_api", error=f"Chưa cài google-genai: {e}", error_code="error")

        # Tách system instruction & contents
        system_texts: List[str] = []
        contents: List[Any] = []
        for m in messages:
            role = m.get("role")
            content = m.get("content") or ""
            if role == "system":
                system_texts.append(content)
            elif role == "user":
                contents.append(types.Content(role="user", parts=[types.Part.from_text(text=content)]))
            elif role == "assistant":
                parts = []
                if content:
                    parts.append(types.Part.from_text(text=content))
                for tc in m.get("tool_calls") or []:
                    fn = tc.get("function", {})
                    args = fn.get("arguments", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except Exception:
                            args = {}
                    parts.append(types.Part.from_function_call(name=fn.get("name", ""), args=args))
                if parts:
                    contents.append(types.Content(role="model", parts=parts))
            elif role == "tool":
                fn_name = m.get("name", "tool")
                try:
                    resp_obj = json.loads(content) if isinstance(content, str) else content
                    if not isinstance(resp_obj, dict):
                        resp_obj = {"result": resp_obj}
                except Exception:
                    resp_obj = {"result": str(content)}
                contents.append(
                    types.Content(
                        role="user",
                        parts=[types.Part.from_function_response(name=fn_name, response=resp_obj)],
                    )
                )

        # Chuyển OpenAI tools schema sang Gemini FunctionDeclaration
        gemini_tools = None
        if tools:
            decls = []
            for t in tools:
                fn = t.get("function", {})
                params = fn.get("parameters") or {"type": "object", "properties": {}}
                decls.append(
                    types.FunctionDeclaration(
                        name=fn.get("name", ""),
                        description=fn.get("description", ""),
                        parameters_json_schema=params,
                    )
                )
            gemini_tools = [types.Tool(function_declarations=decls)]

        last_err = ""
        for offset in range(len(keys)):
            key_idx = (self._gemini_key_idx + offset) % len(keys)
            try:
                client = genai.Client(api_key=keys[key_idx])
                config = types.GenerateContentConfig(
                    system_instruction="\n\n".join(system_texts) if system_texts else None,
                    temperature=temperature,
                    tools=gemini_tools,
                )
                resp = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                self._gemini_key_idx = key_idx

                tool_calls: List[LLMToolCall] = []
                text_parts: List[str] = []
                if resp.candidates and resp.candidates[0].content and resp.candidates[0].content.parts:
                    for i, part in enumerate(resp.candidates[0].content.parts):
                        if getattr(part, "function_call", None):
                            fc = part.function_call
                            tool_calls.append(
                                LLMToolCall(
                                    id=f"call_gem_{int(time.time()*1000)}_{i}",
                                    name=fc.name,
                                    arguments=dict(fc.args) if fc.args else {},
                                )
                            )
                        elif getattr(part, "text", None):
                            text_parts.append(part.text)

                return LLMResponse(
                    content="".join(text_parts).strip(),
                    tool_calls=tool_calls,
                    provider="gemini_api",
                    model=model_name,
                )
            except Exception as e:
                last_err = str(e)
                lower_err = last_err.lower()
                if "429" in lower_err or "quota" in lower_err or "resource_exhausted" in lower_err:
                    logger.warning(f"[LLMGateway] Gemini key #{key_idx} hết quota, xoay key...")
                    continue
                if "401" in lower_err or "api key not valid" in lower_err:
                    return LLMResponse(provider="gemini_api", error="GEMINI_API_KEY không hợp lệ.", error_code="auth")
                break

        return LLMResponse(
            provider="gemini_api",
            error=f"Lỗi Gemini API: {last_err[:250]}",
            error_code="quota" if ("429" in last_err or "quota" in last_err.lower()) else "error",
        )

    def _call_openai_compat(
        self,
        provider: str,
        url: str,
        api_key: str,
        model: str,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]],
        temperature: float,
        timeout: float = 45.0,
    ) -> LLMResponse:
        if not api_key and provider not in ("ollama", "local_gemini"):
            return LLMResponse(provider=provider, error=f"Thiếu API key cho {provider}", error_code="unconfigured")

        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        try:
            res = requests.post(url, headers=headers, json=payload, timeout=timeout)
        except Exception as e:
            return LLMResponse(provider=provider, model=model, error=f"Không kết nối được {provider}: {e}", error_code="offline")

        if res.status_code != 200:
            body = res.text[:300]
            lower = body.lower()
            if provider == "local_gemini" and (
                res.status_code in (401, 403, 503)
                or "cookie" in lower
                or "1psid" in lower
                or "authentication failed" in lower
                or "not initialized" in lower
            ):
                self._last_cookie_error = body
                return LLMResponse(
                    provider=provider,
                    model=model,
                    error="Cookie Gemini Web đã hết hạn hoặc không hợp lệ. Vui lòng cập nhật Cookie mới.",
                    error_code="cookie_expired",
                )
            code = "quota" if res.status_code == 429 else ("auth" if res.status_code in (401, 403) else "error")
            return LLMResponse(provider=provider, model=model, error=f"{provider} HTTP {res.status_code}: {body}", error_code=code)

        try:
            data = res.json()
            msg = data["choices"][0]["message"]
            content = msg.get("content") or ""
            raw_tcs = msg.get("tool_calls") or []
            parsed_tcs: List[LLMToolCall] = []
            for i, tc in enumerate(raw_tcs):
                fn = tc.get("function") or {}
                raw_args = fn.get("arguments", "{}")
                if isinstance(raw_args, dict):
                    args = raw_args
                else:
                    try:
                        args = json.loads(raw_args)
                    except Exception:
                        args = {}
                parsed_tcs.append(
                    LLMToolCall(
                        id=tc.get("id") or f"call_{provider}_{i}",
                        name=fn.get("name", ""),
                        arguments=args,
                    )
                )

            # Fallback: nếu model viết khối ```sql SELECT ... ``` thay vì native tool_calls
            if not parsed_tcs and content:
                sql_match = re.search(r"```(?:sql)?\s*(SELECT[\s\S]+?)```", content, re.IGNORECASE)
                if sql_match:
                    parsed_tcs.append(
                        LLMToolCall(
                            id=f"call_text_{int(time.time())}",
                            name="execute_safe_sql",
                            arguments={"query": sql_match.group(1).strip()},
                        )
                    )
                    content = ""

            if provider == "local_gemini":
                self._last_cookie_error = None

            return LLMResponse(
                content=content.strip(),
                tool_calls=parsed_tcs,
                provider=provider,
                model=model,
            )
        except Exception as e:
            return LLMResponse(provider=provider, model=model, error=f"Lỗi phân tích phản hồi {provider}: {e}", error_code="error")

    def _call_local_gemini(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]],
        temperature: float,
    ) -> LLMResponse:
        cfg = self._get_local_gemini_config()
        status = self.get_local_gemini_cookie_status()
        if status.get("status") == "offline":
            return LLMResponse(
                provider="local_gemini",
                model=cfg["model"],
                error=f"Dịch vụ Gemini Web Proxy chưa chạy tại {cfg['root_url']}.",
                error_code="offline",
            )
        if status.get("status") == "cookie_expired":
            return LLMResponse(
                provider="local_gemini",
                model=cfg["model"],
                error="Cookie Gemini Web đã hết hạn hoặc không hợp lệ. Vui lòng cập nhật Cookie mới.",
                error_code="cookie_expired",
            )

        return self._call_openai_compat(
            provider="local_gemini",
            url=cfg["chat_url"],
            api_key=cfg["api_key"],
            model=cfg["model"],
            messages=messages,
            tools=tools,
            temperature=temperature,
            timeout=60.0,
        )


llm_gateway = LLMGateway()

