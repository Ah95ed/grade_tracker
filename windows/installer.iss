#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif

[Setup]
AppName=Masar
AppVersion={#MyAppVersion}
DefaultDirName={autopf}\Masar
DefaultGroupName=Masar
OutputDir=Output
OutputBaseFilename=masar-windows-setup
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes

[Files]
Source: "..\build\windows\x64\runner\Release\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{autodesktop}\Masar"; Filename: "{app}\masar.exe"
Name: "{group}\Masar"; Filename: "{app}\masar.exe"

[Run]
Filename: "{app}\masar.exe"; Description: "Launch Masar"; Flags: nowait postinstall skipifsilent