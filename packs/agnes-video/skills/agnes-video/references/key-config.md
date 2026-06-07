# Agnes API Key Configuration

This video skill reuses the same Agnes API key configuration as `agnes-image`.

The key is read from either environment variable `AGNES_API_KEY` or local file `C:\Users\C\.codex\agnes.env`.

## Current Local File

Expected file path:

```text
C:\Users\C\.codex\agnes.env
```

Expected content format:

```env
AGNES_API_KEY=YOUR_API_KEY
```

Do not commit this file to a repository and do not paste real keys into prompts, docs, or shared logs.

## PowerShell Setup

Set it for the current session:

```powershell
$env:AGNES_API_KEY = "YOUR_API_KEY"
```

Set it persistently for the Windows user:

```powershell
[Environment]::SetEnvironmentVariable("AGNES_API_KEY", "YOUR_API_KEY", "User")
```

Open a new terminal after setting the persistent variable.
