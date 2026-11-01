#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif

[Setup]
AppName=راصد الدرجات
AppVersion={#MyAppVersion}
DefaultDirName={autopf}\GradeTracker
DefaultGroupName=راصد الدرجات
OutputDir=Output
OutputBaseFilename=masar-windows-setup
SetupIconFile=runner\resources\app_icon.ico
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes

[Files]
Source: "..\build\windows\x64\runner\Release\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{autodesktop}\راصد الدرجات"; Filename: "{app}\grade_tracker.exe"
Name: "{group}\راصد الدرجات"; Filename: "{app}\grade_tracker.exe"

[Run]
Filename: "{app}\grade_tracker.exe"; Description: "تشغيل راصد الدرجات"; Flags: nowait postinstall skipifsilent
