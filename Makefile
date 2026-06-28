.PHONY: dev stop up down logs migrate seed studio clean install


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
