FROM public.ecr.aws/docker/library/node:20-alpine

# OpenSSL is required by Prisma's query engine and isn't in the base Alpine
# image. Installing it here bakes it into the image layer permanently —
# unlike the old heredoc-based deploy, this never needs to be reinstalled.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 4000

# db push (not migrate deploy) since this project doesn't maintain a
# prisma/migrations folder — schema changes are pushed directly. This
# occasionally logs a warning about dropping the `session` table on
# startup; that's expected (connect-pg-simple owns that table, not
# Prisma) and it recreates itself automatically. Safe to ignore.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node src/app.js"]
