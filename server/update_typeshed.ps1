[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$extract = [IO.Path]::GetTempFileName()
del $extract
$zip = "$extract.zip"
$target = $MyInvocation.MyCommand.Definition | Split-Path -Parent | Join-Path -ChildPath "typeshed-fallback"

rm $target -Recurse -Force
mkdir -f $target, $target\stdlib, $target\third_party;

$commits = Invoke-RestMethod -Uri https://api.github.com/repos/python/typeshed/commits
$hash = $commits[0].sha

iwr "https://github.com/python/typeshed/archive/$hash.zip" -OutFile $zip

Expand-Archive $zip $extract -Force


pushd $extract\typeshed-$hash
try {
    copy -r -fo stdlib, third_party, LICENSE $target
	[IO.File]::WriteAllLines("$target\commit.txt", $hash)
} finally {
    popd
}

rmdir -r -fo $extract
del -fo $zip
