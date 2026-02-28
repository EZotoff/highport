# Learnings

## Frontend API Patterns

- Narrative generation uses a direct fetch to the Python RAG service (localhost:8000).
- Types are shared between the API client and the React hooks.
- React hooks wrap the API calls to provide `isLoading` and `error` states, following standard async hook patterns.
- `useNarrativeAvailable` provides a way to gracefully degrade UI if the RAG service is offline.
