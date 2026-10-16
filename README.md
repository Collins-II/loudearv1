# Loudear

Loudear is a Next.js application with a custom Node.js server for Socket.IO.

## Local development

Install dependencies, copy `.env.example` to `.env.local`, fill in the required credentials, then run:

```bash
npm ci
npm run dev
```

The app is served at [http://localhost:3000](http://localhost:3000).

## Production deployment

Deploy to a long-running Node.js host that supports WebSockets; the custom server handles both Next.js requests and Socket.IO. Use Node.js 20.9 or newer.

1. Configure the required environment variables from `.env.example` in the deployment environment. Set `MONGODB_URL`, `NEXT_AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_BASE_URL`, Cloudinary credentials, `NEXT_PUBLIC_GOOGLE_ADSENSE_ID` for ad revenue, and at least one complete OAuth provider.
2. Install locked dependencies and verify the production build:

   ```bash
   npm ci
   npm run lint
   npm run build
   ```

3. Start the production server with `npm start`. Do not use `next start` for the live app; that omits the Socket.IO server.
4. Configure the host’s health checks, HTTPS termination, persistent process supervision, and WebSocket upgrade forwarding. Keep secrets in the host’s secret manager, never in source control.

Advertising is the primary monetization channel. E-commerce (cart, licensing, Stripe checkout) is temporarily disabled; set `NEXT_PUBLIC_ECOMMERCE_ENABLED=true` and rebuild to re-enable it.

Stripe (only when e-commerce is enabled), email, Apple sign-in, and mobile-money providers require their respective optional credentials in `.env.example`; do not enable these features in production until provider credentials and callbacks are configured and tested.
