#!/usr/bin/env pwsh

param (
    [string]$subcommand = "",
    [string]$m = "",
    [string]$forkRemote = "pyright-fork",
    [string]$forkBranch = ""
)

$ErrorActionPreference = "Stop"

# Prevent slowdowns until git-subrepo 0.4.2.
$env:FILTER_BRANCH_SQUELCH_WARNING = 1

function Invoke-CallOk {
    param (
        [scriptblock]$ScriptBlock
    )
    Write-Host "== $ScriptBlock =="
    & @ScriptBlock
    return ($lastexitcode -eq 0)
}

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

$currentCommit = (git config --file packages/pyright/.gitrepo subrepo.commit) | Write-Output

switch ($subcommand) {
    "clone" {
        # Force clone the repo.
        Invoke-Call { git subrepo clone https://github.com/microsoft/pyright.git packages/pyright }
        break
    }
    "reclone" {
        # Remove the temporary branch and worktree.
        Invoke-Call { git subrepo clean packages/pyright }
        # Force clone the repo.
        Invoke-Call { git subrepo clone --force https://github.com/microsoft/pyright.git packages/pyright }
        break
    }
    "pull" {
        $githubCommits = Invoke-RestMethod -Uri https://api.github.com/repos/microsoft/pyright/commits/main
        $newCommit = $githubCommits[0].sha

        if ($currentCommit -eq $newCommit) {
            Write-Output "Already at pyright commit $newCommit."
            break
        }

        Write-Output "Updating to pyright commit $newCommit."

        # Remove the temporary branch and worktree.
        Invoke-Call { git subrepo clean packages/pyright }

        # Pull changes and squash commit them.
        Invoke-Call { git subrepo pull packages/pyright }

        # Now, branch to see if there are any diffs. If not, then we can just reclone.
        Write-Host "Branching to check if the pyright tree is clean."
        Invoke-Call { git subrepo clean packages/pyright }
        Invoke-Call { git subrepo branch packages/pyright }
        
        Push-Location .git/tmp/subrepo/packages/pyright
        $noDiff = Invoke-CallOk { git diff --quiet $newCommit }
        Pop-Location

        if ($noDiff) {
            # No diff, so it's safe to manually move the subrepo parent to HEAD.
            Write-Host "pyright tree is clean, moving subrepo parent."
            $newParent = (git rev-parse HEAD) | Write-Output
            Invoke-Call { git config --file packages/pyright/.gitrepo subrepo.parent $newParent }
            Invoke-Call { git commit -am "Update git-subrepo parent" }
        }
        else {
            Write-Host "pyright tree has changes not pushed upstream."
        }
        
        break
    }
    "branch" {
        if ($m -eq "") {
            Write-Error "Please provide a commit message with -m." -ErrorAction Stop
        }

        # Remove the temporary branch and worktree.
        Invoke-Call { git subrepo clean packages/pyright }
        # Ensure we have all of the subrepo refs.
        Invoke-Call { git subrepo fetch packages/pyright }
        # Populate the subrepo/packages/pyright branch with new changes.
        Invoke-Call { git subrepo branch packages/pyright }
        # Enter worktree; changes here are applied to the subrepo/packages/pyright branch.
        Push-Location .git/tmp/subrepo/packages/pyright
        # Remove all commits after the last pull and restage the difference.
        Invoke-Call { git reset --soft $currentCommit }
        # Commit changes with a new message.
        Invoke-Call { git commit -m `"$m`" }
        # Return to repo root.
        Pop-Location
        break
    }
    "push-to-fork" {
        if ($forkRemote -eq "") {
            Write-Error "Please provide forkRemote." -ErrorAction Stop
        }

        if ($forkBranch -eq "") {
            Write-Error "Please provide forkBranch." -ErrorAction Stop
        }

        Invoke-Call { git push $forkRemote subrepo/packages/pyright:$forkBranch }
        break
    }
    default {
        Write-Host "Run one of:"
        Write-Host "    subrepo.ps1 pull"
        Write-Host '    subrepo.ps1 branch -m "commit message"'
        Write-Host "    subrepo.ps1 push-to-fork -forkBranch some-branch-name"
        Write-Host "    subrepo.ps1 push-to-fork -forkRemote my-custom-remote -forkBranch some-branch-name"
        Write-Host "    subrepo.ps1 reclone"
        break
    }
}
