/**
 * Windows Desktop Application
 * A modern Win32 API application with a graphical user interface
 *
 * Author: itnerdz03
 * License: MIT
 */

#ifndef UNICODE
#define UNICODE
#endif

#ifndef _UNICODE
#define _UNICODE
#endif

#include <windows.h>
#include <commctrl.h>
#include <string>
#include <sstream>
#include "resource.h"

// Link with Common Controls library
#pragma comment(lib, "comctl32.lib")

// Enable visual styles
#pragma comment(linker,"\"/manifestdependency:type='win32' \
    name='Microsoft.Windows.Common-Controls' version='6.0.0.0' \
    processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'\"")

// Global Variables
HINSTANCE g_hInstance;
HWND g_hMainWnd;
HWND g_hStatusBar;
HWND g_hEditControl;
HWND g_hButton;

// Window class name
const wchar_t CLASS_NAME[] = L"WindowsAppClass";

// Control IDs
#define IDC_EDIT_CONTROL    1001
#define IDC_BUTTON_CLICK    1002
#define IDC_BUTTON_CLEAR    1003
#define IDC_STATUSBAR       1004

// Function declarations
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
void CreateControls(HWND hwnd);
void OnCommand(HWND hwnd, int id, HWND hwndCtl, UINT codeNotify);
void OnSize(HWND hwnd, UINT state, int cx, int cy);
void UpdateStatusBar(const wchar_t* message);
void CenterWindow(HWND hwnd);

/**
 * Application entry point
 */
int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance,
                    PWSTR pCmdLine, int nCmdShow)
{
    // Store instance handle
    g_hInstance = hInstance;

    // Initialize common controls
    INITCOMMONCONTROLSEX icex;
    icex.dwSize = sizeof(INITCOMMONCONTROLSEX);
    icex.dwICC = ICC_BAR_CLASSES | ICC_STANDARD_CLASSES;
    InitCommonControlsEx(&icex);

    // Register the window class
    WNDCLASSEX wc = {};
    wc.cbSize = sizeof(WNDCLASSEX);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = WindowProc;
    wc.cbClsExtra = 0;
    wc.cbWndExtra = 0;
    wc.hInstance = hInstance;
    wc.hIcon = LoadIcon(hInstance, MAKEINTRESOURCE(IDI_APPICON));
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wc.lpszMenuName = MAKEINTRESOURCE(IDR_MAINMENU);
    wc.lpszClassName = CLASS_NAME;
    wc.hIconSm = LoadIcon(hInstance, MAKEINTRESOURCE(IDI_APPICON));

    if (!RegisterClassEx(&wc))
    {
        MessageBox(NULL, L"Window Registration Failed!", L"Error",
                   MB_ICONEXCLAMATION | MB_OK);
        return 0;
    }

    // Create the window
    g_hMainWnd = CreateWindowEx(
        0,                              // Optional window styles
        CLASS_NAME,                     // Window class
        L"Windows Desktop Application", // Window text
        WS_OVERLAPPEDWINDOW,           // Window style

        // Size and position
        CW_USEDEFAULT, CW_USEDEFAULT, 800, 600,

        NULL,       // Parent window
        NULL,       // Menu (will be loaded from resource)
        hInstance,  // Instance handle
        NULL        // Additional application data
    );

    if (g_hMainWnd == NULL)
    {
        MessageBox(NULL, L"Window Creation Failed!", L"Error",
                   MB_ICONEXCLAMATION | MB_OK);
        return 0;
    }

    // Center the window on screen
    CenterWindow(g_hMainWnd);

    // Show the window
    ShowWindow(g_hMainWnd, nCmdShow);
    UpdateWindow(g_hMainWnd);

    // Run the message loop
    MSG msg = {};
    while (GetMessage(&msg, NULL, 0, 0) > 0)
    {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return (int)msg.wParam;
}

/**
 * Window procedure - handles window messages
 */
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
    switch (uMsg)
    {
    case WM_CREATE:
        CreateControls(hwnd);
        UpdateStatusBar(L"Ready");
        return 0;

    case WM_COMMAND:
        OnCommand(hwnd, LOWORD(wParam), (HWND)lParam, HIWORD(wParam));
        return 0;

    case WM_SIZE:
        OnSize(hwnd, (UINT)wParam, LOWORD(lParam), HIWORD(lParam));
        return 0;

    case WM_GETMINMAXINFO:
        {
            LPMINMAXINFO lpMMI = (LPMINMAXINFO)lParam;
            lpMMI->ptMinTrackSize.x = 400;
            lpMMI->ptMinTrackSize.y = 300;
        }
        return 0;

    case WM_CLOSE:
        if (MessageBox(hwnd, L"Are you sure you want to exit?",
                       L"Confirm Exit", MB_YESNO | MB_ICONQUESTION) == IDYES)
        {
            DestroyWindow(hwnd);
        }
        return 0;

    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    }

    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

/**
 * Create child controls
 */
void CreateControls(HWND hwnd)
{
    // Create a group box
    HWND hGroupBox = CreateWindowEx(
        0, L"BUTTON", L"Application Controls",
        WS_CHILD | WS_VISIBLE | BS_GROUPBOX,
        20, 20, 740, 200,
        hwnd, NULL, g_hInstance, NULL
    );

    // Create a multi-line edit control
    g_hEditControl = CreateWindowEx(
        WS_EX_CLIENTEDGE, L"EDIT", L"",
        WS_CHILD | WS_VISIBLE | WS_VSCROLL | ES_MULTILINE | ES_AUTOVSCROLL,
        40, 50, 700, 100,
        hwnd, (HMENU)IDC_EDIT_CONTROL, g_hInstance, NULL
    );

    // Set default font for edit control
    HFONT hFont = CreateFont(16, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                             DEFAULT_CHARSET, OUT_DEFAULT_PRECIS,
                             CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
                             DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
    SendMessage(g_hEditControl, WM_SETFONT, (WPARAM)hFont, TRUE);

    // Create "Add Text" button
    g_hButton = CreateWindowEx(
        0, L"BUTTON", L"Add Sample Text",
        WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
        40, 170, 150, 35,
        hwnd, (HMENU)IDC_BUTTON_CLICK, g_hInstance, NULL
    );
    SendMessage(g_hButton, WM_SETFONT, (WPARAM)hFont, TRUE);

    // Create "Clear" button
    HWND hClearButton = CreateWindowEx(
        0, L"BUTTON", L"Clear",
        WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
        200, 170, 100, 35,
        hwnd, (HMENU)IDC_BUTTON_CLEAR, g_hInstance, NULL
    );
    SendMessage(hClearButton, WM_SETFONT, (WPARAM)hFont, TRUE);

    // Create status bar
    g_hStatusBar = CreateWindowEx(
        0, STATUSCLASSNAME, NULL,
        WS_CHILD | WS_VISIBLE | SBARS_SIZEGRIP,
        0, 0, 0, 0,
        hwnd, (HMENU)IDC_STATUSBAR, g_hInstance, NULL
    );

    // Set status bar parts
    int parts[] = { 200, 400, -1 };
    SendMessage(g_hStatusBar, SB_SETPARTS, 3, (LPARAM)parts);
    SendMessage(g_hStatusBar, SB_SETTEXT, 0, (LPARAM)L"Status: Ready");
    SendMessage(g_hStatusBar, SB_SETTEXT, 1, (LPARAM)L"Windows Desktop App");
    SendMessage(g_hStatusBar, SB_SETTEXT, 2, (LPARAM)L"v1.0.0");
}

/**
 * Handle WM_COMMAND messages
 */
void OnCommand(HWND hwnd, int id, HWND hwndCtl, UINT codeNotify)
{
    switch (id)
    {
    case IDC_BUTTON_CLICK:
        {
            // Get current text length
            int len = GetWindowTextLength(g_hEditControl);

            // Add sample text
            std::wstring sampleText = L"Hello from Windows Desktop Application!\r\n";
            sampleText += L"This is a C++ Win32 application.\r\n";
            sampleText += L"-----------------------------------\r\n";

            // Append to existing text
            SendMessage(g_hEditControl, EM_SETSEL, len, len);
            SendMessage(g_hEditControl, EM_REPLACESEL, FALSE, (LPARAM)sampleText.c_str());

            UpdateStatusBar(L"Text added successfully");
        }
        break;

    case IDC_BUTTON_CLEAR:
        SetWindowText(g_hEditControl, L"");
        UpdateStatusBar(L"Text cleared");
        break;

    case ID_FILE_NEW:
        SetWindowText(g_hEditControl, L"");
        UpdateStatusBar(L"New document created");
        break;

    case ID_FILE_EXIT:
        SendMessage(hwnd, WM_CLOSE, 0, 0);
        break;

    case ID_HELP_ABOUT:
        MessageBox(hwnd,
            L"Windows Desktop Application v1.0.0\n\n"
            L"A modern Windows application built with C++ and Win32 API.\n\n"
            L"Author: itnerdz03\n"
            L"License: MIT",
            L"About", MB_OK | MB_ICONINFORMATION);
        break;

    case ID_EDIT_COPY:
        SendMessage(g_hEditControl, WM_COPY, 0, 0);
        UpdateStatusBar(L"Text copied to clipboard");
        break;

    case ID_EDIT_PASTE:
        SendMessage(g_hEditControl, WM_PASTE, 0, 0);
        UpdateStatusBar(L"Text pasted from clipboard");
        break;

    case ID_EDIT_SELECTALL:
        SendMessage(g_hEditControl, EM_SETSEL, 0, -1);
        UpdateStatusBar(L"All text selected");
        break;
    }
}

/**
 * Handle WM_SIZE messages
 */
void OnSize(HWND hwnd, UINT state, int cx, int cy)
{
    // Resize status bar
    SendMessage(g_hStatusBar, WM_SIZE, 0, 0);

    // Get status bar height
    RECT rcStatus;
    GetWindowRect(g_hStatusBar, &rcStatus);
    int statusHeight = rcStatus.bottom - rcStatus.top;

    // Update status bar parts based on window width
    int parts[] = { cx / 3, cx * 2 / 3, -1 };
    SendMessage(g_hStatusBar, SB_SETPARTS, 3, (LPARAM)parts);
}

/**
 * Update status bar text
 */
void UpdateStatusBar(const wchar_t* message)
{
    std::wstringstream ss;
    ss << L"Status: " << message;
    SendMessage(g_hStatusBar, SB_SETTEXT, 0, (LPARAM)ss.str().c_str());
}

/**
 * Center window on screen
 */
void CenterWindow(HWND hwnd)
{
    RECT rc;
    GetWindowRect(hwnd, &rc);

    int screenWidth = GetSystemMetrics(SM_CXSCREEN);
    int screenHeight = GetSystemMetrics(SM_CYSCREEN);

    int windowWidth = rc.right - rc.left;
    int windowHeight = rc.bottom - rc.top;

    int x = (screenWidth - windowWidth) / 2;
    int y = (screenHeight - windowHeight) / 2;

    SetWindowPos(hwnd, NULL, x, y, 0, 0, SWP_NOZORDER | SWP_NOSIZE);
}
