@echo off
setlocal
cd /d "%~dp0codes"
call npm.cmd start pid
exit /b %ERRORLEVEL%
