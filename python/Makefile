.PHONY: up-de up-es up-fr up-pl up-uk-fr down logs ollama-check rebuild

OLLAMA_HOST ?= http://192.168.0.111:11434

up:
	APP_LANGUAGE=de-uk docker compose up

up-de:
	APP_LANGUAGE=de-uk docker compose up

up-es:
	APP_LANGUAGE=es-uk docker compose up

up-fr:
	APP_LANGUAGE=fr-uk docker compose up

up-pl:
	APP_LANGUAGE=pl-uk docker compose up

up-uk-fr:
	APP_LANGUAGE=uk-fr docker compose up

down:
	docker compose down

rebuild:
	docker compose down --rmi local --remove-orphans
	docker compose build --no-cache
	docker compose up --build

logs:
	docker compose logs -f

ollama-check:
	@host="$(OLLAMA_HOST)"; host="$${host%/}"; \
	echo "Checking Ollama at $$host/api/tags"; \
	curl -fsS --connect-timeout 3 "$$host/api/tags" >/dev/null && \
	echo "OK: Ollama is reachable at $$host" || \
	(echo "ERROR: Cannot reach Ollama at $$host"; exit 1)
