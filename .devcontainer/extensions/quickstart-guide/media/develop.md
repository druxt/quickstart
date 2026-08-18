# Start developing

```bash
npm run dev
```

This starts the Nuxt dev server (auto-starting the Drupal backend first, if it isn't already running) with hot reload.

| Service        | URL                   |
| -------------- | --------------------- |
| Nuxt frontend  | http://localhost:3000 |
| Drupal backend | http://127.0.0.1:8888 |

**One-time login link** (no need to remember a password):

```bash
npm run login
```

In a dev container / DevPod, use your editor's **Ports** panel to open these -
not the address Nuxt itself prints in the terminal (something like
`http://172.17.0.2:3000/`). That's the container's own internal network
address; it's correct information from inside the container, but your host
machine can't reach it directly. `localhost:3000` / the Ports panel URL is
what actually works.
