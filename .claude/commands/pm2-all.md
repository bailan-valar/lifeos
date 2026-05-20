Start all services and open PM2 monitor.
```bash
cd "D:\Workspace\canger\lifeos-new\lifeos" && pm2 start ecosystem.config.cjs && start wt.exe -d "D:\Workspace\canger\lifeos-new\lifeos" pwsh -NoExit -c "pm2 monit"
```
