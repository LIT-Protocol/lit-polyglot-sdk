# Python SDK

- expose constants for all the abilities and resources and lit networks and scopes and other items
- fix examples and tests to use these constants

- fix entire implementation to match new JS server and Go SDK
- stop logging to the server.log file, and instead store in memory in a max size buffer
- add a method to get the logs
- when the JS server dies, print the logs from the buffer

- create example for basic usage

# Go SDK

- write to cwd with the session storage, or remove session storage... probably write to cwd is easiest
- expose constants for all the abilities and resources and lit networks and scopes and other items
- fix examples and tests to use these constants
