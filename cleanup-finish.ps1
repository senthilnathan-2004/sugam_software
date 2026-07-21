# Run AFTER reloading the VS Code window (Ctrl+Shift+P -> "Developer: Reload Window").
# Reload makes VS Code honor the new .vscode/settings.json watcher excludes so it
# stops holding release*/**/app.asar, letting these delete cleanly.
$root = 'c:\Users\tamil\Downloads\HMS-Software\sugam_software'
$rem = @()
Get-ChildItem $root -Directory -Filter 'release*' | ForEach-Object {
  Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
  if (Test-Path $_.FullName) { $rem += $_.Name }
}
if ($rem) { "STILL LOCKED (reload VS Code first): " + ($rem -join ', ') }
else { "All release* folders deleted. Cleanup complete."; Remove-Item -LiteralPath (Join-Path $root 'cleanup-finish.ps1') -Force -EA SilentlyContinue }
