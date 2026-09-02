# BrowserStack Local Testing

This smoke test checks the homepage and Commercial Solutions page in the latest Chrome, Edge, Firefox, and Safari before deployment.

## Setup

1. Start BrowserStack Local and sign in.
2. Confirm the Local connection shows as active.
3. Set credentials in the current PowerShell session:

   ```powershell
   $env:BROWSERSTACK_USERNAME = 'your-username'
   $env:BROWSERSTACK_ACCESS_KEY = 'your-access-key'
   ```

Do not commit either credential to the repository.

## Run

```powershell
npm run test:browserstack
```

The command starts a local server on port 4173, runs the browser sessions sequentially, and then stops the server. Failure screenshots are written to `test-results/browserstack/`.
