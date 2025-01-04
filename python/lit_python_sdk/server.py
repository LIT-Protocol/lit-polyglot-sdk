import os
import subprocess
import signal
import sys
from pathlib import Path

class NodeServer:
    def __init__(self, port: int):
        self.port = port
        self.process = None
        self.server_path = Path(__file__).parent / "bundled_server.js"

    def start(self):
        """Starts the Node.js server process"""
        if self.process is not None:
            return

        if not self.server_path.exists():
            raise RuntimeError(
                "Bundled server not found. This is likely an installation issue."
            )

        if os.getenv("LIT_DEBUG_JS_SDK_SERVER") == "true":
            log_file = open(Path(__file__).parent / "server.log", "w")
            stdout = stderr = log_file
        else:
            stdout = stderr = subprocess.DEVNULL

        self.process = subprocess.Popen(
            ["node", str(self.server_path)],
            env={**os.environ, "PORT": str(self.port)},
            stdout=stdout,
            stderr=stderr,
            cwd=Path(__file__).parent
        )

    def stop(self):
        """Stops the Node.js server process"""
        if self.process is not None:
            if sys.platform == "win32":
                self.process.send_signal(signal.CTRL_C_EVENT)
            else:
                self.process.terminate()
            self.process.wait()
            self.process = None 