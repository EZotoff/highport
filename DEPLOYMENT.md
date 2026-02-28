# Highport Vercel Deployment Guide

This guide covers deploying the Highport frontend (apps/web) to Vercel.

## Prerequisites

- Vercel account (free tier works for development)
- GitHub repository connected to Vercel
- Backend services (Hocuspocus, Fastify API, RAG service) deployed separately

## Quick Start

### 1. Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select your GitHub repository
4. Vercel will auto-detect the monorepo structure from `vercel.json`

### 2. Configure Environment Variables

In your Vercel project settings (Project Settings > Environment Variables), add:

```
NEXT_PUBLIC_HOCUSPOCUS_URL=https://your-hocuspocus-server.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_RAG_URL=https://rag.yourdomain.com  # optional
```

**Important**: These are public environment variables (prefixed with `NEXT_PUBLIC_`), so they will be visible in the browser. Do NOT put secrets here.

### 3. Deploy

Push to your main branch and Vercel will automatically deploy.

## Configuration Details

The `vercel.json` in the project root configures:

- **buildCommand**: Uses `pnpm turbo build --filter=@highport/web` to build only the web app while respecting dependencies on `@highport/shared`
- **framework**: `nextjs` - Vercel will optimize for Next.js features
- **outputDirectory**: `apps/web/.next` - Output location for Next.js build
- **installCommand**: `pnpm install` - Uses pnpm (required for monorepo)

## Backend Deployment (Separate from Frontend)

The Highport frontend requires three backend services:

### Hocuspocus Server (WebSocket)

- **Service**: Real-time document sync
- **Recommended**: Render, Railway, Fly.io, AWS EC2
- **Environment**: Node.js 20+
- **Command**: `pnpm dev --filter server`

### Fastify API Server

- **Service**: REST API endpoints
- **Recommended**: Same host as Hocuspocus
- **Environment**: Node.js 20+
- **Port**: 3012 locally (configure via environment)

### RAG Service (Optional)

- **Service**: AI chat and knowledge queries
- **Recommended**: Railway, Fly.io, AWS Lambda
- **Environment**: Python 3.11+
- **Command**: `uvicorn apps/rag-service/main:app --host 0.0.0.0 --port 8000`

## Environment Variable Reference

| Variable                     | Purpose                               | Example                  |
| ---------------------------- | ------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_HOCUSPOCUS_URL` | WebSocket endpoint for real-time sync | `https://sync.myapp.com` |
| `NEXT_PUBLIC_API_URL`        | REST API base URL                     | `https://api.myapp.com`  |
| `NEXT_PUBLIC_RAG_URL`        | RAG service endpoint (optional)       | `https://rag.myapp.com`  |

## Troubleshooting

### Build Fails: "Command 'pnpm' not found"

Vercel should auto-install pnpm. If not, add to Environment Variables:

```
VERCEL_BUILD_COMMAND_ENV_WHITELIST=NPM_RC_CONTENT
```

Or manually select pnpm in project settings.

### Build Fails: "@highport/shared not found"

Ensure `turbo.json` specifies `dependsOn: ["^build"]` for the web build task. This tells Turbo to build shared packages first.

### Frontend can't connect to backend

Check:

1. Environment variables are set correctly in Vercel project settings
2. Backend services are deployed and responding
3. CORS is configured on backend to allow requests from your Vercel domain
4. WebSocket connections are not blocked by firewall/proxy

Example CORS header for Hocuspocus:

```
Access-Control-Allow-Origin: https://your-vercel-domain.vercel.app
```

### Blank Page or 404

1. Check browser console (F12) for JavaScript errors
2. Verify `outputDirectory` matches your Next.js output location
3. Ensure static assets are included in build

## Monitoring & Logs

In Vercel dashboard:

- **Deployments**: View build logs and deployment history
- **Functions**: Monitor API routes if using Next.js API routes
- **Analytics**: Track performance metrics

## Advanced Configuration

### Custom Domain

1. In Vercel project settings, go to Domains
2. Add your custom domain
3. Update your DNS provider with Vercel's nameservers

### Environment-Specific Settings

Use Vercel's environment feature to have different settings for Preview vs Production:

```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url_prod" // Preview gets "@api_url_preview"
  }
}
```

Then in project settings, create secrets for each environment.

## Git Workflow

The `vercel.json` includes:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  }
}
```

This means:

- Main branch → automatically deploys to Production
- Other branches → automatically create Preview deployments
- Disable auto-deploy in settings if needed

## Security Notes

- **Never commit secrets** to `.env` files in the repository
- **Use Vercel's environment variables** for all secrets
- **NEXT*PUBLIC*\* variables are visible in browser** - only use for non-sensitive data
- For sensitive backend URLs, consider:
  - Using a reverse proxy
  - Authentication tokens (passed separately)
  - Backend-to-backend communication for secrets

## Performance Optimization

The Next.js app benefits from Vercel's optimizations:

- **Edge Caching**: Static pages cached globally
- **ISR (Incremental Static Regeneration)**: Regenerate pages on-demand
- **Image Optimization**: Automatic image processing
- **Code Splitting**: Only load JavaScript needed for each page

See `.next/` configuration in `next.config.js` for advanced settings.

## Support

For issues specific to:

- **Vercel deployment**: Check [Vercel Docs](https://vercel.com/docs)
- **Next.js**: See [Next.js Docs](https://nextjs.org/docs)
- **Highport integration**: See main [README.md](./README.md)
