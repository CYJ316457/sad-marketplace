# Agnes API Key Configuration

The Agnes image skill reads the API key from either environment variable `AGNES_API_KEY` or local file `C:\Users\C\.codex\agnes.env`.

## Recommended: User Environment Variable

Set it for the current PowerShell session:

```powershell
$env:AGNES_API_KEY = "YOUR_API_KEY"
```

Set it persistently for the Windows user:

```powershell
[Environment]::SetEnvironmentVariable("AGNES_API_KEY", "YOUR_API_KEY", "User")
```

Open a new terminal after setting the persistent variable.

## Local Env File

Create `C:\Users\C\.codex\agnes.env` with this content:

```env
AGNES_API_KEY=YOUR_API_KEY
```

The file is machine-local. Do not commit it to a repository and do not paste real keys into prompts, docs, or shared logs.

## Validation

Check whether the key is visible to the current session:

```powershell
if ($env:AGNES_API_KEY) { "AGNES_API_KEY is set" } else { "AGNES_API_KEY is missing" }
```

The script also checks `C:\Users\C\.codex\agnes.env` automatically if the environment variable is missing.
