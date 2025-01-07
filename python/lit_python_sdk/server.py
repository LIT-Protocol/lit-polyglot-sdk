import os
import subprocess
import signal
import sys
from pathlib import Path
from threading import Lock
from typing import Optional

class RotatingBuffer:
    """A circular buffer that maintains the last max_size bytes"""
    def __init__(self, max_size: int = 32 * 1024 * 1024):  # 32MB default
        self.buffer = bytearray(max_size)
        self.max_size = max_size
        self.pos = 0
        self.size = 0
        self.lock = Lock()

    def write(self, data: bytes) -> int:
        with self.lock:
            n = len(data)
            if n > self.max_size:
                # If input is larger than buffer, only keep the last max_size bytes
                data = data[-self.max_size:]
                n = len(data)

            # First copy
            copied = min(n, self.max_size - self.pos)
            self.buffer[self.pos:self.pos + copied] = data[:copied]
            
            if copied < n:
                # If we hit the end of the buffer, wrap around
                self.buffer[:n - copied] = data[copied:]
                self.pos = n - copied
            else:
                self.pos = (self.pos + n) % self.max_size

            # Update size
            self.size = min(self.size + n, self.max_size)
            return n

    def get_contents(self) -> str:
        with self.lock:
            if self.size < self.max_size:
                return self.buffer[:self.size].decode('utf-8', errors='replace')
            
            # Combine the two parts of the circular buffer
            result = bytearray(self.max_size)
            result[:self.max_size - self.pos] = self.buffer[self.pos:]
            result[self.max_size - self.pos:] = self.buffer[:self.pos]
            return result.decode('utf-8', errors='replace')

class NodeServer:
    def __init__(self, port: int):
        self.port = port
        self.process: Optional[subprocess.Popen] = None
        self.server_path = Path(__file__).parent / "bundled_server.js"
        self.logs = RotatingBuffer()

    def start(self):
        """Starts the Node.js server process"""
        if self.process is not None:
            return

        if not self.server_path.exists():
            raise RuntimeError(
                "Bundled server not found. This is likely an installation issue."
            )

        # Create a pipe for capturing output
        def log_writer(data: bytes):
            self.logs.write(data)
            if os.getenv("LIT_DEBUG_JS_SDK_SERVER"):
                sys.stderr.buffer.write(data)
                sys.stderr.buffer.flush()

        self.process = subprocess.Popen(
            ["node", str(self.server_path)],
            env={**os.environ, "PORT": str(self.port)},
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=Path(__file__).parent
        )

        # Start threads to read output
        def reader_thread(pipe, callback):
            try:
                while True:
                    data = pipe.read1()
                    if not data:
                        break
                    callback(data)
            except (ValueError, OSError):
                pass  # Pipe was closed

        import threading
        threading.Thread(target=reader_thread, args=(self.process.stdout, log_writer), daemon=True).start()
        threading.Thread(target=reader_thread, args=(self.process.stderr, log_writer), daemon=True).start()

    def stop(self):
        """Stops the Node.js server process"""
        if self.process is not None:
            if sys.platform == "win32":
                self.process.send_signal(signal.CTRL_C_EVENT)
            else:
                self.process.terminate()
            self.process.wait()
            self.process = None

    def get_logs(self) -> str:
        """Returns the current contents of the log buffer"""
        return self.logs.get_contents() 