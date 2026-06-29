.PHONY: dev stop up down logs migrate seed studio clean install dsl-check dsl-check-all dsl-compile dsl-preview


dev: install
	docker compose -f docker-compose.dev.yml up -d
	npm run dev

stop:
	docker compose -f docker-compose.dev.yml down

install:
	@[ -d node_modules ] || npm install


up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f app


migrate:
	npm run db:push

migrate-prod:
	npm run db:migrate

seed:
	node scripts/build-lessons.mjs
	node --env-file=.env prisma/seed.js

studio:
	npm run db:studio


clean:
	docker compose down -v
	docker compose -f docker-compose.dev.yml down -v
	rm -rf .next node_modules


dsl-check:
	npx tsx scripts/dsl.ts check $(f)

dsl-check-all:
	npx tsx scripts/dsl.ts check-all

dsl-compile:
	npx tsx scripts/dsl.ts compile $(f) $(or $(scene),1)

dsl-preview:
	@echo "open http://localhost:3000/dsl-preview?file=$(or $(f),quadratics-1.dsl)"
	@xdg-open "http://localhost:3000/dsl-preview?file=$(or $(f),quadratics-1.dsl)" 2>/dev/null || open "http://localhost:3000/dsl-preview?file=$(or $(f),quadratics-1.dsl)" 2>/dev/null || true
