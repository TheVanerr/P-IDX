@echo off
setlocal
cd /d "%~dp0codes"
call npm.cmd start both
exit /b %ERRORLEVEL%
