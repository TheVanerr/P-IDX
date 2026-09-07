@echo off
setlocal
cd /d "%~dp0"
call npm.cmd start cad
exit /b %ERRORLEVEL%
