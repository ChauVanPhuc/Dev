# Backup and Restore

Tài liệu này hướng dẫn cách backup và restore database SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [Backup Database](#-backup-database)
2. [Restore Database](#-restore-database)
3. [Automated Backup](#-automated-backup)
4. [Backup Strategy](#-backup-strategy)

---

## 💾 Backup Database

### Full Backup

```sql
BACKUP DATABASE SmartFlowDB 
TO DISK = 'C:\Backups\SmartFlowDB_Full.bak'
WITH FORMAT,
MEDIANAME = 'SmartFlowDB_Backup',
NAME = 'Full Backup of SmartFlowDB';
```

### Differential Backup

```sql
BACKUP DATABASE SmartFlowDB 
TO DISK = 'C:\Backups\SmartFlowDB_Diff.bak'
WITH DIFFERENTIAL;
```

### Transaction Log Backup

```sql
BACKUP LOG SmartFlowDB 
TO DISK = 'C:\Backups\SmartFlowDB_Log.bak';
```

---

## 🔄 Restore Database

### Restore from Full Backup

```sql
RESTORE DATABASE SmartFlowDB 
FROM DISK = 'C:\Backups\SmartFlowDB_Full.bak'
WITH REPLACE,
MOVE 'SmartFlowDB_Data' TO 'C:\Data\SmartFlowDB.mdf',
MOVE 'SmartFlowDB_Log' TO 'C:\Data\SmartFlowDB.ldf';
```

### Restore with Differential

```sql
RESTORE DATABASE SmartFlowDB 
FROM DISK = 'C:\Backups\SmartFlowDB_Full.bak'
WITH NORECOVERY;

RESTORE DATABASE SmartFlowDB 
FROM DISK = 'C:\Backups\SmartFlowDB_Diff.bak'
WITH RECOVERY;
```

---

## 🤖 Automated Backup

### PowerShell Script

```powershell
# backup_database.ps1
$backupPath = "C:\Backups\"
$database = "SmartFlowDB"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupPath${database}_$timestamp.bak"

$sql = "BACKUP DATABASE $database TO DISK = '$backupFile' WITH FORMAT"
sqlcmd -S localhost\SQLEXPRESS -E -Q $sql

# Keep only last 7 days
Get-ChildItem $backupPath -Filter "*.bak" | 
Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | 
Remove-Item
```

### Schedule with Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 2:00 AM
4. Action: Start a program
5. Program: `powershell.exe`
6. Arguments: `-File "C:\Scripts\backup_database.ps1"`

---

## 📋 Backup Strategy

### Backup Schedule

| Type | Frequency | Retention |
|------|-----------|-----------|
| Full Backup | Daily | 7 days |
| Differential | Every 6 hours | 2 days |
| Transaction Log | Every 15 minutes | 1 day |

### Backup Locations

- **Local**: `C:\Backups\`
- **Network**: `\\backup-server\SmartFlowDB\`
- **Cloud**: Azure Blob Storage (optional)

---

**Last Updated:** 2026-06-03
