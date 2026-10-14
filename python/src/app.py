"""Streamlit UI: translate via local Ollama; language pair selectable in the sidebar."""

from __future__ import annotations

import os
import time

import ollama
import streamlit as st
from pydantic import ValidationError

from languages import language_labels, list_language_codes, load_language
from llm_response import parse_translation_json, with_token_usage
from settings import get_language_code
from util import (
    check_ollama_available,
    completion_field,
    connection_unreachable_hint,
    fetch_translation_completion,
    format_elapsed_seconds,
    format_token_usage,
    handle_source_textarea_focus,
    ollama_client,
    render_special_character_buttons,
)

DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "translategemma:12b")
OLLAMA_HOST = (os.environ.get("OLLAMA_HOST") or "").strip()
MODEL_OPTIONS = ("translategemma:12b", "translategemma:27b", "translategemma:latest", "gemma4:31b")

st.set_page_config(page_title="translategemma", page_icon="🌐", layout="centered")

LANGUAGE_CODES = list_language_codes()
LANGUAGE_LABELS = language_labels()

if "language_code" not in st.session_state:
    initial = get_language_code()
    if initial not in LANGUAGE_CODES:
        st.error(
            f"Unknown language pair {initial!r}. "
            f"Use one of: {', '.join(LANGUAGE_CODES)}"
        )
        st.stop()
    st.session_state.language_code = initial

if "ollama_model" not in st.session_state:
    initial_model = DEFAULT_MODEL.strip()
    st.session_state.ollama_model = (
        initial_model if initial_model in MODEL_OPTIONS else MODEL_OPTIONS[0]
    )

if "source_text" not in st.session_state:
    st.session_state.source_text = ""
if "translation_response" not in st.session_state:
    st.session_state.translation_response = None
if "translation_elapsed_seconds" not in st.session_state:
    st.session_state.translation_elapsed_seconds = None

if "_app_started" not in st.session_state:
    st.session_state._app_started = True
    st.session_state._focus_source_textarea = True

if st.session_state.pop("_clear_source_after_translate", False):
    st.session_state.source_text = ""
    st.session_state._focus_source_textarea = True

st.sidebar.selectbox(
    "Ollama model",
    options=MODEL_OPTIONS,
    key="ollama_model",
)

if st.session_state.get("_prev_ollama_model") != st.session_state.ollama_model:
    if "_prev_ollama_model" in st.session_state:
        st.session_state.translation_response = None
        st.session_state.translation_elapsed_seconds = None
st.session_state._prev_ollama_model = st.session_state.ollama_model

model = st.session_state.ollama_model
host = OLLAMA_HOST

api_ok, model_ok, health_msg = check_ollama_available(host, model)
if api_ok and model_ok:
    st.sidebar.success(health_msg)
elif api_ok:
    st.sidebar.warning(health_msg)
else:
    st.sidebar.error(health_msg)

st.sidebar.selectbox(
    "Language pair",
    options=LANGUAGE_CODES,
    format_func=lambda code: LANGUAGE_LABELS[code],
    key="language_code",
)

if st.session_state.get("_prev_language_code") != st.session_state.language_code:
    if "_prev_language_code" in st.session_state:
        st.session_state.translation_response = None
        st.session_state.translation_elapsed_seconds = None
st.session_state._prev_language_code = st.session_state.language_code

LANG = load_language(st.session_state.language_code)

st.title(LANG.heading)
st.caption(LANG.caption)

render_special_character_buttons(LANG)

# Apply character append before the text_area widget (Streamlit syncs widget state at rerun start).
_pending_char = st.session_state.pop("_pending_source_append", None)
if _pending_char is not None:
    st.session_state.source_text = (st.session_state.get("source_text") or "") + _pending_char
    st.session_state._focus_source_textarea = True

source = st.text_area(
    LANG.source_label,
    height=180,
    placeholder=LANG.source_placeholder,
    key="source_text",
)

handle_source_textarea_focus()

if st.button(
    LANG.translate_button,
    type="primary",
    disabled=not source.strip() or not api_ok or not model_ok,
    help=None if api_ok and model_ok else "Connect to Ollama and select an installed model.",
):
    st.session_state["_translation_started_at"] = time.perf_counter()
    raw_content = ""
    try:
        client = ollama_client(host)
        with st.spinner("Translating…"):
            raw_content, resp_obj = fetch_translation_completion(
                client,
                model,
                source.strip(),
                system_prompt=LANG.system_prompt,
            )
        if not raw_content:
            st.session_state.pop("_translation_started_at", None)
            st.warning("Model returned no text. Check the model name and that Ollama is running.")
        else:
            payload = parse_translation_json(raw_content)
            prompt_tokens = int(completion_field(resp_obj, "prompt_eval_count") or 0)
            completion_tokens = int(completion_field(resp_obj, "eval_count") or 0)
            st.session_state.translation_response = with_token_usage(
                payload,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
            )
            st.session_state["_clear_source_after_translate"] = True
            st.rerun()
    except ValidationError as e:
        st.session_state.pop("_translation_started_at", None)
        st.error(f"Model output did not match the expected JSON shape: {e}")
        if raw_content.strip():
            with st.expander("Raw model output"):
                st.code(raw_content)
    except ollama.ResponseError as e:
        st.session_state.pop("_translation_started_at", None)
        st.error(f"Ollama error: {e}")
    except ConnectionError as e:
        st.session_state.pop("_translation_started_at", None)
        st.error(f"Cannot reach Ollama: {e}. Is the server running?")
    except Exception as e:  # noqa: BLE001 — show user-facing errors in UI
        st.session_state.pop("_translation_started_at", None)
        hint = connection_unreachable_hint(e)
        if hint:
            st.error(f"{e}\n\n{hint}")
        else:
            st.error(str(e))

if st.session_state.translation_response:
    started_at = st.session_state.pop("_translation_started_at", None)
    if started_at is not None:
        st.session_state.translation_elapsed_seconds = time.perf_counter() - started_at
    tr = st.session_state.translation_response
    st.subheader(LANG.translation_heading)
    st.markdown(f"**Original phrase:** {tr.original_phrase}")
    st.markdown("**Words:**")
    for w in tr.words:
        row = f"- **{w.word}** — {w.translation}"
        if w.explanation:
            row += f" — _{w.explanation}_"
        st.markdown(row)
    st.markdown(f"**Full phrase translation:** {tr.full_phrase_translation}")
    token_line = format_token_usage(tr)
    if token_line:
        st.caption(token_line)
    elapsed_line = format_elapsed_seconds(st.session_state.translation_elapsed_seconds)
    if elapsed_line:
        st.caption(elapsed_line)

st.sidebar.markdown("---")
