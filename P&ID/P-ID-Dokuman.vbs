' P&ID Doküman — & içeren klasör yolu için güvenli başlatıcı
Option Explicit

Dim shell, fso, rootDir, codesDir, nodeModules, electronCli, cmd

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
codesDir = fso.BuildPath(rootDir, "codes")
nodeModules = fso.BuildPath(codesDir, "node_modules")
electronCli = fso.BuildPath(codesDir, "node_modules\electron\cli.js")

If Not fso.FolderExists(codesDir) Then
  MsgBox "codes klasörü bulunamadı:" & vbCrLf & codesDir, vbCritical, "P&ID Doküman"
  WScript.Quit 1
End If

shell.CurrentDirectory = codesDir

If Not fso.FolderExists(nodeModules) Then
  MsgBox "İlk çalıştırma: bağımlılıklar yükleniyor (bir kez)." & vbCrLf & "Pencere kapanınca tekrar deneyin.", vbInformation, "P&ID Doküman"
  shell.Run "cmd /c npm install", 1, True
End If

If Not fso.FileExists(electronCli) Then
  MsgBox "Electron bulunamadı. codes klasöründe npm install çalıştırın.", vbCritical, "P&ID Doküman"
  WScript.Quit 1
End If

cmd = "node """ & electronCli & """ ."
shell.Run cmd, 0, False
