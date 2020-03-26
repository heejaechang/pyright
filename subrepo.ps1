param (
    [string]$subcommand = "",
    [string]$m = "",
    [string]$forkRemote = "pyright-fork",
    [string]$forkBranch = ""
)

$ErrorActionPreference = "Stop"

function Invoke-Call {
    param (
        [scriptblock]$ScriptBlock
    )

    Write-Host "== $ScriptBlock =="
    & @ScriptBlock
    if ($lastexitcode -ne 0) {
        Write-Error "Command failed." -ErrorAction Stop
    }
}

switch ($subcommand) {
    "pull" {
        # Remove the temporary branch and worktree.
        Invoke-Call { git subrepo clean server/pyright }
        # Pull changes and squash commit them.
        Invoke-Call { git subrepo pull server/pyright }
        break
    }
    "branch" {
        if ($m -eq "") {
            Write-Error "Please provide a commit message with -m." -ErrorAction Stop
        }

        # Remove the temporary branch and worktree.
        Invoke-Call { git subrepo clean server/pyright }
        # Populate the subrepo/server/pyright branch with new changes.
        Invoke-Call { git subrepo branch server/pyright }
        # Enter worktree; changes here are applied to the subrepo/server/pyright branch.
        Invoke-Call { Push-Location .git/tmp/subrepo/server/pyright }
        # Remove all commits after the last pull and restage the difference.
        Invoke-Call { git reset --soft refs/subrepo/server/pyright/fetch }
        # Commit changes with a new message.
        Invoke-Call { git commit -m `"$m`" }
        # Return to pyrx.
        Invoke-Call { Pop-Location }
        break
    }
    "push-to-fork" {
        if ($forkRemote -eq "") {
            Write-Error "Please provide forkRemote." -ErrorAction Stop
        }

        if ($forkBranch -eq "") {
            Write-Error "Please provide forkBranch." -ErrorAction Stop
        }

        Invoke-Call { git push $forkRemote subrepo/server/pyright:$forkBranch }
        break
    }
    default {
        Write-Host "Run one of:"
        Write-Host "    subrepo.ps1 pull"
        Write-Host '    subrepo.ps1 branch -m "commit message"'
        Write-Host "    subrepo.ps1 push-to-fork -forkBranch some-branch-name"
        Write-Host "    subrepo.ps1 push-to-fork -forkRemote my-custom-remote -forkBranch some-branch-name"
        break
    }
}
