# Windows Desktop Application

A modern Windows desktop application built with C++ and the Win32 API. This application demonstrates fundamental Windows programming concepts including window creation, message handling, menus, and controls.

## Features

- Modern Win32 API implementation
- Multi-line text editor with copy/paste support
- Menu bar with File, Edit, View, and Help menus
- Status bar with multiple sections
- Keyboard shortcuts (accelerators)
- DPI-aware rendering
- Windows 7/8/10/11 compatibility
- Visual styles support (themed controls)

## Project Structure

```
WindowsApp/
├── src/
│   └── main.cpp              # Main application source code
├── include/
│   └── resource.h            # Resource identifiers
├── resources/
│   ├── app.rc                # Resource script (menus, icons, version)
│   ├── app.manifest          # Application manifest for visual styles
│   └── app.ico               # Application icon (you need to add this)
├── CMakeLists.txt            # CMake build configuration
├── WindowsApp.sln            # Visual Studio solution
├── WindowsApp.vcxproj        # Visual Studio project
├── WindowsApp.vcxproj.filters# Visual Studio filters
└── README.md                 # This file
```

## Prerequisites

- Windows 10 SDK or later
- One of the following build tools:
  - **Visual Studio 2019/2022** (recommended) with "Desktop development with C++" workload
  - **CMake 3.16+** with Visual Studio Build Tools or MinGW-w64

## Building the Application

### Option 1: Visual Studio (Recommended)

1. Open `WindowsApp.sln` in Visual Studio 2019 or later
2. Select build configuration (Debug/Release) and platform (x86/x64)
3. Build the solution (F7 or Build > Build Solution)
4. The executable will be in `bin/<Platform>/<Configuration>/`

### Option 2: CMake with Visual Studio Generator

```bash
# Create build directory
mkdir build
cd build

# Configure with Visual Studio generator
cmake .. -G "Visual Studio 17 2022" -A x64

# Build
cmake --build . --config Release

# The executable will be in build/bin/Release/
```

### Option 3: CMake with MinGW

```bash
# Create build directory
mkdir build
cd build

# Configure with MinGW
cmake .. -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build .

# The executable will be in build/bin/
```

## Adding an Application Icon

The project expects an icon file at `resources/app.ico`. You can:

1. Create your own icon using an icon editor (like GIMP or online tools)
2. Use a placeholder icon by downloading one from the internet
3. Comment out the icon line in `resources/app.rc` if you don't need one:
   ```rc
   // IDI_APPICON ICON "app.ico"
   ```

## Application Controls

### Menu Shortcuts

| Shortcut    | Action          |
|-------------|-----------------|
| Ctrl+N      | New document    |
| Ctrl+O      | Open file       |
| Ctrl+S      | Save file       |
| Ctrl+Z      | Undo            |
| Ctrl+Y      | Redo            |
| Ctrl+X      | Cut             |
| Ctrl+C      | Copy            |
| Ctrl+V      | Paste           |
| Ctrl+A      | Select All      |
| Alt+F4      | Exit            |

### Buttons

- **Add Sample Text**: Appends demonstration text to the editor
- **Clear**: Clears all text from the editor

## Customization

### Changing Window Title

In `main.cpp`, modify the `CreateWindowEx` call:
```cpp
L"Your New Title",  // Window text
```

### Changing Window Size

Modify the width and height parameters in `CreateWindowEx`:
```cpp
CW_USEDEFAULT, CW_USEDEFAULT, 800, 600,  // x, y, width, height
```

### Adding New Menu Items

1. Add a new ID in `include/resource.h`:
   ```cpp
   #define ID_FILE_MYITEM    40050
   ```

2. Add the menu item in `resources/app.rc`:
   ```rc
   MENUITEM "&My Item\tCtrl+M",    ID_FILE_MYITEM
   ```

3. Handle the command in `OnCommand()` in `main.cpp`:
   ```cpp
   case ID_FILE_MYITEM:
       // Your code here
       break;
   ```

## Technical Details

- **Character Set**: Unicode (UTF-16)
- **Subsystem**: Windows GUI
- **C++ Standard**: C++17
- **Minimum OS**: Windows Vista (Windows 10+ recommended)
- **Architecture**: x86 and x64

## License

MIT License - See LICENSE file for details.

## Author

itnerdz03
