# CMake Configuration for Windows Desktop Application
# Minimum CMake version required
cmake_minimum_required(VERSION 3.16)

# Project name and version
project(WindowsApp VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Windows-specific settings
if(WIN32)
    # Enable Unicode
    add_definitions(-DUNICODE -D_UNICODE)

    # Set Windows subsystem
    set(CMAKE_WIN32_EXECUTABLE ON)

    # Find required Windows libraries
    set(WIN_LIBS
        user32
        gdi32
        comctl32
        shell32
        comdlg32
        advapi32
    )
endif()

# Include directories
include_directories(${CMAKE_SOURCE_DIR}/include)

# Source files
set(SOURCES
    src/main.cpp
)

# Resource files (Windows only)
if(WIN32)
    set(RESOURCES
        resources/app.rc
    )
endif()

# Create executable
add_executable(${PROJECT_NAME} WIN32
    ${SOURCES}
    ${RESOURCES}
)

# Link libraries
if(WIN32)
    target_link_libraries(${PROJECT_NAME} ${WIN_LIBS})
endif()

# Set output directory
set_target_properties(${PROJECT_NAME} PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
    RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_BINARY_DIR}/bin/Debug
    RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_BINARY_DIR}/bin/Release
)

# Installation rules
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
)

# Copy resources to build directory
if(WIN32)
    # Copy manifest
    configure_file(
        ${CMAKE_SOURCE_DIR}/resources/app.manifest
        ${CMAKE_BINARY_DIR}/bin/app.manifest
        COPYONLY
    )
endif()

# Compiler-specific flags
if(MSVC)
    # Use static runtime library
    set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

    # Warning level 4
    target_compile_options(${PROJECT_NAME} PRIVATE /W4)

    # Treat warnings as errors in release builds
    target_compile_options(${PROJECT_NAME} PRIVATE
        $<$<CONFIG:Release>:/WX>
    )
else()
    # MinGW or other compilers
    target_compile_options(${PROJECT_NAME} PRIVATE -Wall -Wextra)
endif()

# Print configuration summary
message(STATUS "")
message(STATUS "Windows Desktop Application Configuration")
message(STATUS "=========================================")
message(STATUS "Version:        ${PROJECT_VERSION}")
message(STATUS "Build type:     ${CMAKE_BUILD_TYPE}")
message(STATUS "C++ Standard:   ${CMAKE_CXX_STANDARD}")
message(STATUS "Compiler:       ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
message(STATUS "")
