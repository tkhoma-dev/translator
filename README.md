# translategemma

A small translator for language study. You paste a sentence, and the app returns three things: the original phrase, a word-by-word gloss, and a natural translation of the whole sentence.

Each word row can carry a short grammar note. Nouns include gender and the singular form. Verbs include principal parts, such as infinitive, past, and perfect. The source text is split in order, and prefixed or separable verbs stay one token.

## Two apps

The same idea is implemented twice. They do not call each other.

| App | UI | Model | URL |
| --- | --- | --- | --- |
| [`python/`](python/) | Streamlit | Local [Ollama](https://ollama.com/) model, default `translategemma:12b` | http://localhost:8501 |
| [`nextjs/`](nextjs/) | Next.js | Google Gemini. Default is `gemini-3.5-flash-lite`. Also `gemini-3.8-flash` and `gemini-3.6-flash` | http://localhost:3000 |

The sidebar in both apps lets you pick the model and the language pair, and it has buttons for letters that are missing from a US keyboard.

## Language pairs

- German → Ukrainian (`de-uk`)
- Spanish → Ukrainian (`es-uk`)
- French → Ukrainian (`fr-uk`)
- Polish → Ukrainian (`pl-uk`)
- Ukrainian → French (`uk-fr`)

Prompts and labels live in `python/src/languages/` and `nextjs/src/lib/languages.ts`.

## Run

Setup, Docker, and environment variables are documented in each app:

- [Python / Streamlit](python/README.md)
- [Next.js / Gemini](nextjs/README.md)

The Next.js app reads `GEMINI_API_KEY` and `GEMINI_MODEL` from `nextjs/.env.local`. The Python app expects Ollama at `OLLAMA_HOST`.
