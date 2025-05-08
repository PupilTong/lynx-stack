cmake_minimum_required(VERSION 3.9)
cmake_policy(SET CMP0042 NEW)
set (CMAKE_CXX_STANDARD 17)
set (CMAKE_C_STANDARD 17)
set(CMAKE_CXX_FLAGS_RELEASE "-O3")
set(CMAKE_C_FLAGS_RELEASE "-O3")


project (offscreen-dom-napi)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist)
# Define NAPI_VERSION
# v18.17.0+, 20.3.0+, 21.0.0 and all later versions
add_definitions(-DNAPI_VERSION=9)
include_directories(${CMAKE_JS_INC})
file(GLOB SOURCE_FILES "clang/napi.c" "clang/core/*.c")
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})