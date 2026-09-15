# Vinyl

## Run on another device

Install the dependencies, then start the API and web app on the same computer:

```powershell
pip install -r requirements.txt
python server.py
npm install
npm run dev
```

Find the computer's local IPv4 address with `ipconfig`, then open this address from a phone or another computer on the same Wi-Fi:

```text
http://YOUR_LOCAL_IP:5173
```

Allow ports `5173` and `8000` through the computer's firewall when prompted. Devices on mobile data need a public HTTPS deployment or a secure tunnel; a private Wi-Fi address is not reachable directly from the internet.

## Deploy publicly

This repository includes `Dockerfile` and `render.yaml` for a public deployment. Create a new Blueprint on Render from this repository. Render will build the frontend and API together and provide an HTTPS URL that works from any network or device.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
